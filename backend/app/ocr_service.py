import os
import io
import re
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("ocr_service")

# Global lazy-loaded RapidOCR engine
_rapid_ocr_engine = None

# Standard expected baseline configuration
EXPECTED_RECIPIENT_NAME = os.getenv("EXPECTED_RECIPIENT_NAME", "ABRAHAM JOSEPH THADATHIL")
EXPECTED_UPI_ID = os.getenv("EXPECTED_UPI_ID", "abrahamjosephthadathil200@okhdfcbank")

# Auto-discover Tesseract binary path if available
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TESS_ENV_DIR = os.path.join(BASE_DIR, "tesseract_env")
TESS_BIN = os.path.join(TESS_ENV_DIR, "usr", "bin", "tesseract")
TESS_LIB = os.path.join(TESS_ENV_DIR, "usr", "lib", "x86_64-linux-gnu")
TESS_DATA = os.path.join(TESS_ENV_DIR, "usr", "share", "tesseract-ocr", "4.00", "tessdata")

try:
    import pytesseract
    if os.path.exists(TESS_BIN):
        pytesseract.pytesseract.tesseract_cmd = TESS_BIN
        if os.path.exists(TESS_LIB):
            ld_path = os.environ.get("LD_LIBRARY_PATH", "")
            os.environ["LD_LIBRARY_PATH"] = f"{TESS_LIB}:{ld_path}" if ld_path else TESS_LIB
        if os.path.exists(TESS_DATA):
            os.environ["TESSDATA_PREFIX"] = TESS_DATA
        logger.info(f"Using rootless Tesseract at {TESS_BIN}")
    else:
        possible_paths = [
            "/usr/bin/tesseract",
            "/usr/local/bin/tesseract",
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]
        for p in possible_paths:
            if os.path.exists(p):
                pytesseract.pytesseract.tesseract_cmd = p
                logger.info(f"Using system Tesseract at {p}")
                break
except Exception as e:
    logger.warning(f"pytesseract setup notice: {e}")


def get_rapid_ocr():
    global _rapid_ocr_engine
    if _rapid_ocr_engine is None:
        try:
            import os
            os.environ["OMP_NUM_THREADS"] = "1"
            os.environ["OPENBLAS_NUM_THREADS"] = "1"
            os.environ["MKL_NUM_THREADS"] = "1"
            from rapidocr_onnxruntime import RapidOCR
            _rapid_ocr_engine = RapidOCR(
                use_angle_cls=False,
                intra_op_num_threads=1,
                inter_op_num_threads=1
            )
            logger.info("RapidOCR engine successfully initialized in low-memory single-thread mode.")
        except Exception as e:
            logger.warning(f"RapidOCR initialization failed: {e}")
            _rapid_ocr_engine = False
    return _rapid_ocr_engine


def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Multi-tier OCR extraction:
    Tier 1: RapidOCR (pure Python/ONNX CPU engine, fast, reliable, zero C++ binaries required)
    Tier 2: OpenCV + PyTesseract
    Tier 3: PIL + PyTesseract
    """
    extracted_text = ""

    # Tier 1: RapidOCR
    try:
        engine = get_rapid_ocr()
        if engine:
            import cv2
            import numpy as np

            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                h, w = img.shape[:2]
                max_dim = 800
                if max(h, w) > max_dim:
                    scale = max_dim / max(h, w)
                    img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
                results, _ = engine(img)
            else:
                results, _ = engine(image_bytes)

            if results:
                lines = [line[1] for line in results if line and len(line) > 1]
                extracted_text = "\n".join(lines).strip()
                if extracted_text:
                    return extracted_text
    except Exception as e:
        logger.warning(f"RapidOCR execution notice: {e}")



    # Tier 2: OpenCV + PyTesseract
    try:
        import cv2
        import numpy as np
        import pytesseract

        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is not None:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            h, w = gray.shape[:2]
            if w < 1000:
                gray = cv2.resize(gray, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)

            thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            extracted_text = pytesseract.image_to_string(thresh)
            if not extracted_text.strip():
                extracted_text = pytesseract.image_to_string(gray)
    except Exception as e:
        logger.warning(f"OpenCV/Tesseract processing notice: {str(e)}")

    # Tier 3: PIL + PyTesseract
    if not extracted_text.strip():
        try:
            from PIL import Image
            import pytesseract

            image = Image.open(io.BytesIO(image_bytes))
            extracted_text = pytesseract.image_to_string(image)
        except Exception as e:
            logger.warning(f"PIL/Tesseract fallback notice: {str(e)}")

    return extracted_text.strip()


def parse_any_upi_screenshot(image_bytes: bytes) -> Dict[str, Any]:
    """
    General OCR parser for ANY UPI screenshot.
    """
    try:
        raw_text = extract_text_from_image(image_bytes)
    except Exception as e:
        logger.warning(f"Failed to extract text from image: {str(e)}")
        raw_text = ""

    text_lower = raw_text.lower()
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    # 1. Detect App
    app_detected = "Unknown / General UPI"
    if "google pay" in text_lower or "gpay" in text_lower:
        app_detected = "Google Pay (GPay)"
    elif "phonepe" in text_lower:
        app_detected = "PhonePe"
    elif "paytm" in text_lower:
        app_detected = "Paytm"
    elif "bhim" in text_lower:
        app_detected = "BHIM UPI"
    elif "amazon pay" in text_lower or "amazonpay" in text_lower:
        app_detected = "Amazon Pay"
    elif "upi" in text_lower or "poweredby" in text_lower or "powered by" in text_lower:
        app_detected = "UPI Payment App"

    # 2. Is UPI Payment Screenshot?
    upi_keywords = [
        "upi", "gpay", "google pay", "phonepe", "paytm", "bhim",
        "paid to", "banking name", "utr", "ref no", "transferred to",
        "payment successful", "abraham", "thadathil"
    ]
    is_upi_payment = any(kw in text_lower for kw in upi_keywords) or bool(re.search(r'[₹\?]?\s*\d+', raw_text))

    # 3. Detect Payment Status
    payment_status = "UNSPECIFIED"
    if any(kw in text_lower for kw in ["paid", "payment successful", "successful", "completed", "transferred to", "sent", "✓"]):
        payment_status = "SUCCESSFUL / PAID"
    elif any(kw in text_lower for kw in ["failed", "declined", "unsuccessful"]):
        payment_status = "FAILED"
    elif any(kw in text_lower for kw in ["pending", "processing", "in progress"]):
        payment_status = "PENDING"

    # 4. Extract Amount
    # Clean text to prevent mistaking UTR, date, or time for amount
    text_no_utr = re.sub(r'\b\d{12}\b', '', text_lower)
    text_no_dates = re.sub(r'\b(202[0-9]|201[0-9])\b', '', text_no_utr)
    text_no_time = re.sub(r'\b\d{1,2}:\d{2}(?:\s*(?:am|pm))?\b', '', text_no_dates)

    amounts_found = []
    # Match currency symbol (₹ or OCR'd ? / rs / inr / paid) followed by amount
    currency_matches = re.finditer(r'(?:[₹\?]|rs\.?|inr|paid)\s*(\d+(?:\.\d{1,2})?)', text_no_time)
    for m in currency_matches:
        try:
            amt = float(m.group(1))
            if 0.1 <= amt <= 100000:
                amounts_found.append(amt)
        except ValueError:
            pass

    if not amounts_found:
        # Fallback regex for numbers
        num_matches = re.finditer(r'\b(\d{1,6}(?:\.\d{1,2})?)\b', text_no_time)
        for m in num_matches:
            try:
                val = float(m.group(1))
                if 1 <= val <= 100000 and val not in [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]:
                    amounts_found.append(val)
            except ValueError:
                pass

    primary_amount = amounts_found[0] if amounts_found else None

    # 5. Extract Recipient Name
    recipient_name = None
    if "abraham" in text_lower or "joseph" in text_lower or "thadathil" in text_lower:
        recipient_name = "ABRAHAM JOSEPH THADATHIL"
    else:
        for i, line in enumerate(lines):
            line_l = line.lower()
            if "paid to" in line_l or "transferred to" in line_l or "receiver" in line_l:
                cleaned = re.sub(r'^(paid to|transferred to|to:?)\s*', '', line, flags=re.IGNORECASE).strip()
                if cleaned and len(cleaned) > 2 and not cleaned.lower().startswith("banking name"):
                    recipient_name = cleaned
                    break
                elif i + 1 < len(lines):
                    candidate1 = lines[i + 1].strip()
                    if candidate1 and len(candidate1) > 2 and not any(kw in candidate1.lower() for kw in ["banking name", "powered", "upi"]):
                        recipient_name = candidate1
                        break

    # 6. Extract Date & Time
    date_time_str = None
    date_match = re.search(
        r'\b(?:\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{2,4}(?:,\s*\d{1,2}:\d{2}\s*(?:am|pm)?)?|\d{1,2}/\d{1,2}/\d{2,4}(?:\s*\d{1,2}:\d{2}\s*(?:am|pm)?)?|\d{1,2}:\d{2}\s*(?:am|pm))\b',
        raw_text,
        re.IGNORECASE
    )
    if date_match:
        date_time_str = date_match.group(0)

    # 7. Extract UTR / Transaction ID (12-digit UPI reference number)
    utr_match = re.search(r'\b\d{12}\b', raw_text)
    transaction_id = utr_match.group(0) if utr_match else None

    return {
        "is_upi_payment": is_upi_payment,
        "app_detected": app_detected,
        "payment_status": payment_status,
        "recipient_name": recipient_name or "Not Extracted",
        "amount": primary_amount,
        "amounts_found": amounts_found,
        "date_time": date_time_str or "Not Extracted",
        "transaction_id": transaction_id or "Not Extracted",
        "raw_text": raw_text if raw_text else "No text extracted from image"
    }


def parse_and_validate_payment(
    image_bytes: bytes,
    expected_amount: float = 100.0,
    expected_payer_name: str = None,
    bypass_name_check: bool = False
) -> Dict[str, Any]:
    """
    Parses OCR text and applies deterministic verification rules for event registration.
    """
    parsed_info = parse_any_upi_screenshot(image_bytes)
    raw_text = parsed_info["raw_text"]
    text_lower = raw_text.lower()

    has_success_indicator = parsed_info["payment_status"] == "SUCCESSFUL / PAID"
    has_upi_indicator = parsed_info["is_upi_payment"]

    recipient_keywords = ["abraham", "joseph", "thadathil", "okhdfcbank"]
    matched_recipient_count = sum(1 for kw in recipient_keywords if kw in text_lower)
    has_recipient_match = matched_recipient_count >= 1 or "abraham" in text_lower or "thadathil" in text_lower

    amounts_found = parsed_info["amounts_found"]
    amount_matches_expected = any(abs(amt - expected_amount) < 0.01 for amt in amounts_found)

    primary_amount = parsed_info["amount"]
    
    payer_found = True
    if bypass_name_check:
        payer_found = True
    elif expected_payer_name and raw_text:
        payer_parts = [p.lower() for p in expected_payer_name.split() if len(p) > 2]
        if payer_parts:
            # We require at least one significant part of the name to be found as a whole word
            import re
            payer_found = any(re.search(rf'\b{re.escape(part)}\b', text_lower) for part in payer_parts)

    # Decision Engine:
    if primary_amount is not None and not amount_matches_expected:
        status = "REJECTED"
        message = f"❌ Payment Rejected: Screenshot shows payment of ₹{primary_amount}, but required fee is ₹{expected_amount}."
    elif amount_matches_expected and has_recipient_match and (has_success_indicator or has_upi_indicator):
        if not payer_found:
            status = "NAME_MISMATCH"
            message = f"⚠️ Name Mismatch: We couldn't find the name '{expected_payer_name}' in the payment receipt."
        else:
            status = "APPROVED"
            message = f"✅ Payment Verified: ₹{expected_amount} paid successfully."
    else:
        status = "REJECTED"
        message = f"❌ Payment Rejected: We couldn't verify the payment details (Amount, Recipient, or Status) from the screenshot. Please upload a clear valid UPI screenshot."

    return {
        "status": status,
        "message": message,
        "ocr_detected": bool(raw_text),
        "raw_text_snippet": raw_text[:300] if raw_text else "No text extracted via OCR engine",
        "has_success_indicator": has_success_indicator,
        "has_upi_indicator": has_upi_indicator,
        "has_recipient_match": has_recipient_match,
        "amounts_found": amounts_found,
        "expected_amount": expected_amount,
        "transaction_id": parsed_info["transaction_id"],
        "detailed_analysis": parsed_info
    }
