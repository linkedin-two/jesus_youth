import { useState, useEffect } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://jesus-youth-ru8k.onrender.com').replace(/\/$/, '');

export default function StepPayment({
  data,
  groupMembers = [],
  deviceId,
  onSubmitPayment,
  submitting,
  submitError,
  paymentSuccess
}) {
  const [copied, setCopied] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [verifyingOcr, setVerifyingOcr] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [showUploadMode, setShowUploadMode] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const upiId = import.meta.env.VITE_UPI_ID || 'abrahamjosephthadathil200@okhdfcbank';
  const accountName = import.meta.env.VITE_UPI_ACCOUNT_NAME || 'Abraham Joseph Thadathil';
  const qrImageSrc = import.meta.env.VITE_UPI_QR_URL || '/upi_qrcode.jpg';

  const totalPeople = groupMembers.length + 1;
  const totalAmount = totalPeople * 100;
  const allMembersList = [...groupMembers, data];

  const copyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const [alternatePayerName, setAlternatePayerName] = useState('');
  const [showAlternateNameInput, setShowAlternateNameInput] = useState(false);

  const performVerification = async (file, expectedPayerName, bypassNameCheck = false) => {
    setVerifyingOcr(true);
    setOcrResult(null);
    setTimerSeconds(1);

    const timerInterval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev === 1) return 2;
        if (prev === 2) return 3;
        if (prev === 3) return 5;
        return prev;
      });
    }, 1000);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('expected_amount', totalAmount);
      if (deviceId) {
        formData.append('device_id', deviceId);
      }
      if (expectedPayerName) {
        formData.append('expected_payer_name', expectedPayerName);
      }
      if (bypassNameCheck) {
        formData.append('bypass_name_check', 'true');
      }

      const res = await fetch(`${API_BASE_URL}/api/verify-payment`, {
        method: 'POST',
        body: formData
      });

      await new Promise(r => setTimeout(r, 4000));
      clearInterval(timerInterval);
      setTimerSeconds(5);

      if (res.ok) {
        const json = await res.json();
        if (json.verification) {
          setOcrResult({
            status: json.verification.status,
            message: json.verification.message,
            amount: json.verification.amounts_found?.[0] || null
          });
          
          if (json.verification.status === 'APPROVED') {
             setTimeout(() => {
                onSubmitPayment(file, {
                  status: json.verification.status,
                  message: json.verification.message,
                  amount: json.verification.amounts_found?.[0] || null
                });
             }, 1000);
          } else if (json.verification.status === 'NAME_MISMATCH') {
             // Reset input state when first showing name mismatch
             setShowAlternateNameInput(false);
          }
        }
      } else {
        setOcrResult({
          status: 'REJECTED',
          message: 'Server error processing screenshot. Please try again.'
        });
      }
    } catch (err) {
      console.warn('Backend API connection notice:', err);
      await new Promise(r => setTimeout(r, 4000));
      clearInterval(timerInterval);
      setTimerSeconds(5);
      
      setOcrResult({
        status: 'REJECTED',
        message: 'Network issue. Could not verify payment.'
      });
    } finally {
      setVerifyingOcr(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setScreenshotFile(file);
    
    // First verification attempt uses registered primary user name
    const defaultName = `${data.name} ${data.surname}`.trim();
    await performVerification(file, defaultName, false);
  };

  const handleCheckAgain = async () => {
    if (screenshotFile && alternatePayerName.trim()) {
       // Second verification explicitly bypasses the strict name check
       // since the user has explicitly confirmed the payer's name
       await performVerification(screenshotFile, alternatePayerName.trim(), true);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setOcrResult(null);
  };

  return (
    <div className="step">
      <h2>Fee Payment (₹{totalAmount})</h2>
      <p className="hint">
        {totalPeople > 1
          ? `Group Payment for ${totalPeople} Delegates (${totalPeople} × ₹100 = ₹${totalAmount}) 👥💳`
          : 'Scan QR code or use UPI ID to complete payment 💳'}
      </p>

      {/* Group Members List Summary */}
      {totalPeople > 1 && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 10,
          padding: '10px 12px',
          marginBottom: 14,
          fontSize: 11
        }}>
          <div style={{ fontWeight: 'bold', color: '#1d4ed8', marginBottom: 4 }}>
            📋 Delegates Included in this Payment ({totalPeople} Total):
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-800)' }}>
            {allMembersList.map((m, idx) => (
              <li key={idx} style={{ margin: '2px 0' }}>
                <strong>{m.name} {m.surname}</strong>
                {idx === 0 && <span style={{ color: 'var(--jy-crimson)', fontWeight: 'bold' }}> (Primary / Leader)</span>}
                <span style={{ color: 'var(--ink-500)', fontSize: 10 }}> — T-Shirt: {m.tShirtSize || 'M'}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {paymentSuccess ? (
        <div className="payment-success-banner">
          <div className="success-check-icon">✓</div>
          <h3>Registration Successful!</h3>
          <p>
            Your registration for {totalPeople} delegate(s) (Total: ₹{totalAmount}) has been submitted successfully!
          </p>
        </div>
      ) : !showUploadMode ? (
        <>
          <div className="qr-container" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8, color: 'var(--jy-crimson)' }}>
              Payee: {accountName}
            </div>

            <img
              src={qrImageSrc}
              alt={`UPI QR Code - ${accountName} ₹${totalAmount}`}
              className="qr-image"
              style={{
                maxWidth: '100%',
                maxHeight: 260,
                borderRadius: 12,
                border: '1px solid var(--ink-200)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <div className="qr-amount-tag" style={{ marginTop: 8, fontSize: 12, fontWeight: 'bold' }}>
              Total Registration Fee: ₹{totalAmount} {totalPeople > 1 ? `(${totalPeople} × ₹100)` : ''}
            </div>

            <div className="upi-id-box" style={{ marginTop: 10, wordBreak: 'break-all' }}>
              <span>UPI ID: <strong>{upiId}</strong></span>
              <button type="button" className="btn-copy" onClick={copyUpi}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowUploadMode(true)}
              style={{ width: '100%', minHeight: 48, fontSize: 14 }}
            >
              Made Payment
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="payment-instructions" style={{ marginTop: 16 }}>
            <h4 style={{ textAlign: 'center', color: 'var(--ink-800)' }}>
              Please upload the screenshot so we can confirm it.
            </h4>
          </div>

          {/* Screenshot Upload Box */}
          <div style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            background: 'var(--card-bg, #ffffff)',
            border: '2px dashed var(--ink-300, #cbd5e1)',
            textAlign: 'center'
          }}>
            {!previewUrl ? (
              <label style={{
                display: 'inline-block',
                background: 'var(--jy-crimson, #d90429)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                marginTop: 4
              }}>
                📷 Choose Screenshot File
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            ) : (
              <div style={{ marginTop: 8 }}>
                <img
                  src={previewUrl}
                  alt="Payment Screenshot Preview"
                  style={{
                    maxHeight: 180,
                    maxWidth: '100%',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    marginBottom: 8
                  }}
                />
                <div>
                  <button
                    type="button"
                    onClick={handleRemoveScreenshot}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#dc2626',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🗑 Remove / Change Screenshot
                  </button>
                </div>
              </div>
            )}

            {/* OCR Progress & Result Banner */}
            {verifyingOcr && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
                <span className="spinner" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
                Verifying payment... {timerSeconds}s
              </div>
            )}

            {ocrResult && (
              <div style={{
                marginTop: 10,
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 12,
                textAlign: 'left',
                background: ocrResult.status === 'APPROVED' ? 'rgba(34, 197, 94, 0.1)' : ocrResult.status === 'REJECTED' || ocrResult.status === 'NAME_MISMATCH' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                border: `1px solid ${ocrResult.status === 'APPROVED' ? 'rgba(34, 197, 94, 0.4)' : ocrResult.status === 'REJECTED' || ocrResult.status === 'NAME_MISMATCH' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
                color: ocrResult.status === 'APPROVED' ? '#15803d' : ocrResult.status === 'REJECTED' || ocrResult.status === 'NAME_MISMATCH' ? '#b91c1c' : '#a16207'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>
                  {ocrResult.status === 'APPROVED' ? '✅ Registration Successful' : ocrResult.status === 'REJECTED' ? '❌ Payment Rejected' : ocrResult.status === 'NAME_MISMATCH' ? '⚠️ Name Mismatch Detected' : '⚡ Screenshot Attached: queued for review'}
                </div>
                <div>{ocrResult.message}</div>

                {ocrResult.status === 'NAME_MISMATCH' && !showAlternateNameInput && (
                  <div style={{ marginTop: 10, borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: 10 }}>
                    <p style={{ marginBottom: 8, fontWeight: 600 }}>Did {data.name} {data.surname} make the payment, or somebody else?</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                       <button type="button" onClick={() => setShowAlternateNameInput(true)} style={{ flex: 1, padding: '8px', fontSize: 11, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
                         Somebody Else Made Payment
                       </button>
                    </div>
                  </div>
                )}
                
                {ocrResult.status === 'NAME_MISMATCH' && showAlternateNameInput && (
                  <div style={{ marginTop: 10, borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: 10 }}>
                    <label style={{ display: 'block', fontSize: 11, marginBottom: 4, fontWeight: 'bold', color: 'var(--ink-900)' }}>Name of the person who made the payment:</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Joseph" 
                      value={alternatePayerName}
                      onChange={(e) => setAlternatePayerName(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', marginBottom: 8, boxSizing: 'border-box' }}
                    />
                    <button type="button" onClick={handleCheckAgain} disabled={!alternatePayerName.trim() || verifyingOcr} style={{ width: '100%', padding: '10px', fontSize: 12, background: 'var(--jy-crimson)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', opacity: (!alternatePayerName.trim() || verifyingOcr) ? 0.5 : 1 }}>
                      {verifyingOcr ? 'Checking...' : 'Check Again'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {submitError && (
            <div style={{ color: 'var(--red-700)', fontSize: 11, marginTop: 12, textAlign: 'center' }}>
              {submitError}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowUploadMode(false)}
              disabled={submitting}
              style={{ width: '100%', marginBottom: 8 }}
            >
              ← Back to QR Code
            </button>
            {/* Manual Submit removed to enforce strict automatic OCR verification */}
          </div>
        </>
      )}
    </div>
  );
}
