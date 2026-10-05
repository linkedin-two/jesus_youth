from fastapi import APIRouter, HTTPException, Query, Response, UploadFile, File, Form
from app.models import StudentRegistrationSchema, AdminActionSchema, APIResponseSchema
from app.database import get_collection, db
from app.ocr_service import parse_and_validate_payment, parse_any_upi_screenshot
from datetime import datetime
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["Registrations"])

@router.post("/register", response_model=APIResponseSchema, status_code=201)
async def register_student(payload: StudentRegistrationSchema):
    try:
        seq_str = "0001"
        if db.client is None:
            demo_reg_id = payload.regId or f"{payload.name}-{payload.surname}-{payload.phone}-{payload.email}-0001"
            return APIResponseSchema(
                status="success",
                message="Registration received (demo mode).",
                registration_id=demo_reg_id,
                regId=demo_reg_id
            )

        collection = get_collection("registrations")
        
        doc = payload.model_dump()
        doc["email"] = payload.email.lower()
        doc["updatedAt"] = datetime.utcnow()

        # Check for existing registration by device_id only
        existing = await collection.find_one({
            "device_id": payload.device_id
        })

        if existing:
            assigned_reg_id = existing.get("regId")
            if not assigned_reg_id:
                count = await collection.count_documents({})
                seq_str = f"{count + 1:04d}"
                assigned_reg_id = f"{payload.name}-{payload.surname}-{payload.phone}-{payload.email}-{seq_str}"
            doc["regId"] = assigned_reg_id
            await collection.update_one({"_id": existing["_id"]}, {"$set": doc})
            return APIResponseSchema(
                status="success",
                message="Registration details updated successfully!",
                registration_id=str(existing["_id"]),
                regId=assigned_reg_id
            )

        # Assign new unique Registration ID in format: First-Last-Phone-Email-0001
        count = await collection.count_documents({})
        seq_str = f"{count + 1:04d}"
        assigned_reg_id = payload.regId or f"{payload.name}-{payload.surname}-{payload.phone}-{payload.email}-{seq_str}"
        doc["regId"] = assigned_reg_id
        doc["createdAt"] = datetime.utcnow()
        result = await collection.insert_one(doc)
        return APIResponseSchema(
            status="success",
            message="Student registration saved to MongoDB Atlas!",
            registration_id=str(result.inserted_id),
            regId=assigned_reg_id
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save registration: {str(e)}")


@router.post("/verify-payment")
async def verify_payment_screenshot(
    file: UploadFile = File(...),
    device_id: Optional[str] = Form(None),
    regId: Optional[str] = Form(None),
    expected_amount: Optional[float] = Form(100.0),
    expected_payer_name: Optional[str] = Form(None),
    bypass_name_check: bool = Form(False)
):
    """
    Accepts uploaded GPay/UPI payment screenshot, processes in-memory using OpenCV+Tesseract,
    updates MongoDB registration status, and returns instant verification result.
    """
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty screenshot file uploaded.")

        verification = parse_and_validate_payment(contents, expected_amount=expected_amount or 100.0, expected_payer_name=expected_payer_name, bypass_name_check=bypass_name_check)
        del contents  # Ensure immediate RAM release

        ocr_status = verification["status"]
        ocr_message = verification["message"]

        # Update document in MongoDB Atlas if client is connected and identifier provided
        if db.client is not None and (device_id or regId):
            collection = get_collection("registrations")
            identifier = device_id or regId
            
            update_payload = {
                "ocrStatus": ocr_status,
                "ocrMessage": ocr_message,
                "ocrVerifiedAt": datetime.utcnow().isoformat(),
                "ocrExtractedText": verification.get("raw_text_snippet"),
                "ocrTransactionId": verification.get("transaction_id"),
                "paymentStatus": "VERIFIED" if ocr_status == "APPROVED" else "PENDING_REVIEW",
                "registrationStatus": ocr_status if ocr_status in ["APPROVED", "MANUAL_REVIEW", "REJECTED"] else "PENDING",
                "updatedAt": datetime.utcnow()
            }

            await collection.update_many(
                {
                    "$or": [
                        {"device_id": identifier},
                        {"phone": identifier},
                        {"regId": identifier}
                    ]
                },
                {"$set": update_payload}
            )

        return {
            "status": "success",
            "verification": verification,
            "ocrStatus": ocr_status,
            "ocrMessage": ocr_message
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")


@router.post("/check-upi")
async def standalone_upi_check(file: UploadFile = File(...)):
    """
    Standalone endpoint for /upi-check tool.
    Extracts Payee Name, Amount, Date & Time, UTR, App Name, and Payment Status from ANY uploaded screenshot.
    """
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty image uploaded.")

        analysis = parse_any_upi_screenshot(contents)
        del contents  # Release RAM immediately

        return {
            "status": "success",
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"UPI Screenshot analysis failed: {str(e)}")



@router.get("/status/{device_id}")
async def get_registration_status(device_id: str):
    if db.client is None:
        return {"registered": False, "status": None}

    collection = get_collection("registrations")
    search_query = device_id.strip()
    doc = await collection.find_one({
        "$or": [
            {"device_id": search_query},
            {"phone": search_query},
            {"regId": search_query},
            {"regId": {"$regex": f"^{search_query}$", "$options": "i"}}
        ]
    })

    if not doc:
        return {"registered": False, "status": None}

    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return {
        "registered": True,
        "status": doc.get("registrationStatus", "PENDING"),
        "registration": doc
    }


@router.get("/admin/registrations")
async def list_admin_registrations(q: str = Query(None), status: str = Query("ALL")):
    if db.client is None:
        return []

    collection = get_collection("registrations")
    query = {}

    if status and status.upper() != "ALL":
        query["registrationStatus"] = status.upper()

    if q:
        regex_pattern = {"$regex": q, "$options": "i"}
        query["$or"] = [
            {"name": regex_pattern},
            {"surname": regex_pattern},
            {"parish": regex_pattern},
            {"diocese": regex_pattern},
            {"phone": regex_pattern},
            {"regId": regex_pattern},
            {"paymentRef": regex_pattern}
        ]

    cursor = collection.find(query).sort("createdAt", -1)
    registrations = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        registrations.append(doc)

    return registrations


@router.post("/admin/action")
async def admin_update_status(payload: AdminActionSchema):
    if db.client is None:
        return {"status": "success", "message": "Demo status updated."}

    collection = get_collection("registrations")
    status_upper = payload.status.upper()

    result = await collection.update_many(
        {
            "$or": [
                {"device_id": payload.device_id},
                {"phone": payload.device_id},
                {"regId": payload.device_id}
            ]
        },
        {
            "$set": {
                "registrationStatus": status_upper,
                "updatedAt": datetime.utcnow()
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Registration not found.")

    return {
        "status": "success",
        "message": f"Status updated to {status_upper}"
    }

class RecordActionSchema(BaseModel):
    action: str # "APPROVED", "REJECTED", "DELETE"

@router.post("/admin/record-action/{record_id}")
async def admin_record_action(record_id: str, payload: RecordActionSchema):
    if db.client is None:
        return {"status": "success", "message": f"Demo {payload.action} action performed."}

    collection = get_collection("registrations")
    action = payload.action.upper()

    try:
        obj_id = ObjectId(record_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid record ID format.")

    if action == "DELETE":
        result = await collection.delete_one({"_id": obj_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Registration not found.")
        return {"status": "success", "message": "Record deleted successfully."}
    elif action in ["APPROVED", "REJECTED", "PENDING"]:
        result = await collection.update_one(
            {"_id": obj_id},
            {"$set": {"registrationStatus": action, "updatedAt": datetime.utcnow()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Registration not found.")
        return {"status": "success", "message": f"Record status updated to {action}."}
    else:
        raise HTTPException(status_code=400, detail="Invalid action.")


@router.get("/export-csv")
async def export_registrations_csv(status: str = Query("ALL")):
    headers = [
        "Registration ID", "Name", "Surname", "Parish", "Diocese", "Phone", "Email",
        "T-Shirt Size", "Registered By / Connected To", "Amount", "Payment Status", "Registration Status",
        "Device ID", "Submitted At"
    ]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)

    if db.client is not None:
        collection = get_collection("registrations")
        query = {}
        if status and status.upper() != "ALL":
            query["registrationStatus"] = status.upper()

        async for doc in collection.find(query).sort("createdAt", -1):
            writer.writerow([
                doc.get("regId", doc.get("registration_id", "")),
                doc.get("name", ""),
                doc.get("surname", ""),
                doc.get("parish", ""),
                doc.get("diocese", ""),
                doc.get("phone", ""),
                doc.get("email", ""),
                doc.get("tShirtSize", ""),
                doc.get("registeredBy", "Primary / Self"),
                doc.get("amount", 100),
                doc.get("paymentStatus", "SUBMITTED"),
                doc.get("registrationStatus", "PENDING"),
                doc.get("device_id", ""),
                doc.get("submittedAt", "")
            ])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=Malabar_Campus_Meet_Registrations_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
    )
