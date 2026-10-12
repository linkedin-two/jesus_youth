import { useState } from 'react';

export default function StepStatusView({ registration, onRefreshStatus, onGoToWelcome }) {
  const [copied, setCopied] = useState(false);

  if (!registration) return null;

  const status = (registration.registrationStatus || 'PENDING').toUpperCase();
  const regId = registration.regId || registration.registration_id || 'Joseph-Kurian-9876543210-joseph@example.com-0001';

  const coord1Name = import.meta.env.VITE_COORDINATOR_1_NAME || 'ABRAHAM JOSEPH';
  const coord1Phone = import.meta.env.VITE_COORDINATOR_1_PHONE || '9567113383';
  const coord2Name = import.meta.env.VITE_COORDINATOR_2_NAME || 'ANCY ALEXANDER';
  const coord2Phone = import.meta.env.VITE_COORDINATOR_2_PHONE || '8089012363';

  const copyRegId = () => {
    navigator.clipboard.writeText(regId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNavigateAway = (actionCallback) => {
    alert(`⚠️ IMPORTANT: MAKE SURE TO REMEMBER YOUR UNIQUE ID!\n\nYOUR UNIQUE ID:\n${regId}\n\nYou will need this Unique ID to enter and check your registration pass on the welcome page anytime!`);
    if (actionCallback) actionCallback();
  };

  return (
    <div className="step status-view">
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(217, 4, 41, 0.1)',
          color: 'var(--jy-crimson)',
          border: '1px solid rgba(217, 4, 41, 0.3)',
          borderRadius: '12px',
          padding: '10px 14px',
          fontSize: '11px',
          fontWeight: 'bold',
          wordBreak: 'break-all',
          maxWidth: '100%'
        }}>
          <div>🆔 YOUR UNIQUE REGISTRATION ID:</div>
          <div style={{ fontSize: '12px', margin: '4px 0', color: 'var(--jy-crimson)' }}>
            {regId}
          </div>
          <button
            type="button"
            className="btn-copy"
            onClick={copyRegId}
            style={{ marginTop: 4, cursor: 'pointer', padding: '4px 10px', fontSize: 10 }}
          >
            {copied ? 'Copied to Clipboard! ✓' : '📋 Copy Unique ID'}
          </button>
        </div>
      </div>

      <div className="notice-box-yellow" style={{ marginBottom: 16, fontSize: 11, textAlign: 'center' }}>
        🔔 <strong>Reminder:</strong> Please copy or take a screenshot of your Unique ID: <br />
        <strong style={{ color: 'var(--jy-crimson)' }}>{regId}</strong>
      </div>

      {status === 'PENDING' && (
        <div className="status-card status-pending">
          <div className="status-badge-icon">⏳</div>
          <h2>Registration Pending Approval</h2>
          <p className="status-message">
            Thank you, <strong>{registration.name} {registration.surname}</strong>! Your registration (Unique ID: <strong style={{ wordBreak: 'break-all' }}>{regId}</strong>) has been received.
          </p>
          <div className="notice-box-yellow">
            📌 Your registration is pending approval from the admin team. You can check back anytime on the welcome page using your Unique ID.
          </div>
        </div>
      )}

      {status === 'APPROVED' && (
        <div className="status-card status-approved">
          <div className="status-badge-icon green">✓</div>
          <h2>Registration Approved! 🎉</h2>
          <p className="status-message">
            Welcome aboard, <strong>{registration.name} {registration.surname}</strong>! Your registration for KCYM SMYM PAROPPADY MEKHALA - VITAMIN C has been <strong>APPROVED</strong>.
          </p>

          <div className="pass-ticket">
            <div className="pass-header">OFFICIAL DELEGATE PASS</div>
            <div className="pass-name">{registration.name} {registration.surname}</div>
            <div className="pass-details">
              <div><span>Unique ID:</span> <strong style={{ fontSize: 9.5, wordBreak: 'break-all' }}>{regId}</strong></div>
              <div><span>Parish:</span> {registration.parish}</div>
              <div><span>Diocese:</span> {registration.diocese}</div>
              <div><span>T-Shirt Size:</span> <strong>{registration.tShirtSize || 'M'}</strong></div>
              <div><span>Venue:</span> DEVAGIRI COLLEGE, KOZHIKODE</div>
              <div><span>Date &amp; Time:</span> 17/10/2026 (02:00 PM – 10:00 PM)</div>
            </div>
            <div className="pass-code" style={{ fontSize: 9, wordBreak: 'break-all' }}>UNIQUE ID: {regId}</div>
          </div>
        </div>
      )}

      {status === 'REJECTED' && (
        <div className="status-card status-rejected">
          <div className="status-badge-icon red">✕</div>
          <h2>Registration Rejected</h2>
          <p className="status-message">
            Sorry <strong>{registration.name} {registration.surname}</strong> (Unique ID: <strong style={{ wordBreak: 'break-all' }}>{regId}</strong>), your registration could not be verified by the admin team.
          </p>
          <div className="notice-box-red">
            If you believe this is an error, please contact coordinators:
            <br />
            <strong>{coord1Name} ({coord1Phone})</strong>
            <br />
            <strong>{coord2Name} ({coord2Phone})</strong>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => handleNavigateAway(onRefreshStatus)}
          style={{ fontSize: 11, padding: '8px 16px', width: '100%' }}
        >
          🔄 Refresh Registration Status
        </button>

        {onGoToWelcome && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleNavigateAway(onGoToWelcome)}
            style={{ fontSize: 11, padding: '8px 16px', width: '100%' }}
          >
            🏠 Return to Welcome Page
          </button>
        )}
      </div>
    </div>
  );
}
