import { useState } from 'react';

export default function StepWelcome({ onOpenAdmin, onLookupUniqueId, lookupError, setLookupError }) {
  const [searchKey, setSearchKey] = useState('');
  const [searching, setSearching] = useState(false);

  const coord1Name = import.meta.env.VITE_COORDINATOR_1_NAME || 'ABRAHAM JOSEPH';
  const coord1Phone = import.meta.env.VITE_COORDINATOR_1_PHONE || '9567113383';
  const coord2Name = import.meta.env.VITE_COORDINATOR_2_NAME || 'ANCY ALEXANDER';
  const coord2Phone = import.meta.env.VITE_COORDINATOR_2_PHONE || '8089012363';

  const handleLookupSubmit = async (e) => {
    e.preventDefault();
    const query = searchKey.trim();
    if (!query) {
      if (setLookupError) setLookupError('Please enter your Unique ID or registered mobile number');
      return;
    }
    setSearching(true);
    if (onLookupUniqueId) {
      await onLookupUniqueId(query);
    }
    setSearching(false);
  };

  return (
    <div className="step closed-card">
      {/* Registration Closed Status Badge */}
      <div className="closed-badge-wrap">
        <span className="closed-badge">
          <span className="closed-dot"></span> REGISTRATION CLOSED
        </span>
      </div>

      <h2 className="closed-title">Online Registrations Closed</h2>
      <p className="closed-desc">
        Online registrations for <strong>KCYM SMYM PAROPPADY MEKHALA — VITAMIN C</strong> have officially closed.
        Thank you for the tremendous response! We look forward to welcoming all registered delegates at Devagiri College.
      </p>

      {/* Important Alert Notice */}
      <div className="closed-alert-box">
        <div className="closed-alert-icon">📢</div>
        <div className="closed-alert-text">
          <strong>Important for Registered Delegates:</strong> Please arrive by <strong>01:30 PM</strong> at the Devagiri College registration desk for check-in, identity verification, and delegate kit distribution.
        </div>
      </div>

      {/* Event Details Card */}
      <div className="event-info-box closed-event-card">
        <div className="closed-event-header">
          <span>✝️</span>
          <span>Event Program &amp; Venue Details</span>
        </div>
        <div className="info-row">
          <span>📅 <strong>Date:</strong> Saturday 17 Oct, 2026 (17/10/2026)</span>
        </div>
        <div className="info-row">
          <span>⏰ <strong>Time:</strong> 02:00 PM – 10:00 PM</span>
        </div>
        <div className="info-row">
          <span>📍 <strong>Venue:</strong> DEVAGIRI COLLEGE, KOZHIKODE</span>
        </div>
        <div className="info-row">
          <span>🚪 <strong>Desk Opens:</strong> 01:30 PM (Verification &amp; Kit Distribution)</span>
        </div>
      </div>

      {/* Six Pillars */}
      <div className="pillars-strip">
        <span>PRAISE • WORD • CONFESSION • ADORATION • FELLOWSHIP • CELEBRATION</span>
      </div>

      {/* Scripture Quote */}
      <div className="scripture-quote">
        “I came that they may have life, and have it abundantly.”
        <br />
        <span style={{ fontWeight: 600 }}>— John 10:10</span>
      </div>

      {/* Registered Delegates Pass Lookup */}
      <div className="lookup-pass-card">
        <div className="lookup-header">
          <span style={{ fontSize: 18 }}>🎫</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink-900)' }}>
              Already Registered? Check Your Delegate Pass
            </div>
            <p className="hint" style={{ margin: 0, fontSize: 10 }}>
              Enter your Unique ID or registered mobile number to view pass &amp; status
            </p>
          </div>
        </div>

        <form onSubmit={handleLookupSubmit} style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={searchKey}
              onChange={(e) => {
                setSearchKey(e.target.value);
                if (setLookupError) setLookupError('');
              }}
              placeholder="e.g. 9876543210 or Unique ID"
              style={{
                flex: 1,
                padding: '9px 12px',
                fontSize: 12,
                borderRadius: 8,
                border: '1.5px solid var(--ink-300)',
                background: '#ffffff',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={searching || !searchKey.trim()}
              style={{
                padding: '9px 16px',
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                flex: '0 0 auto',
                minHeight: 'auto'
              }}
            >
              {searching ? 'Checking...' : 'View Pass 🎫'}
            </button>
          </div>
          {lookupError && (
            <div className="field-error" style={{ marginTop: 8, fontSize: 10.5, color: '#dc2626' }}>
              {lookupError}
            </div>
          )}
        </form>
      </div>

      {/* Coordinator Contacts */}
      <div className="contacts-card" style={{ marginTop: 14 }}>
        <h4>Need Assistance or Details? Contact Coordinators:</h4>
        <div className="contact-item">
          <span>📞 <strong>{coord1Name}</strong>: <a href={`tel:${coord1Phone}`}>{coord1Phone}</a></span>
        </div>
        <div className="contact-item">
          <span>📞 <strong>{coord2Name}</strong>: <a href={`tel:${coord2Phone}`}>{coord2Phone}</a></span>
        </div>
      </div>

      {/* Admin Portal Bottom Trigger */}
      {onOpenAdmin && (
        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <button
            type="button"
            onClick={onOpenAdmin}
            style={{
              background: 'transparent',
              border: '1px solid rgba(153, 27, 27, 0.3)',
              color: 'var(--jy-crimson)',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 'auto'
            }}
          >
            Admin Management Portal 🔐
          </button>
        </div>
      )}
    </div>
  );
}
