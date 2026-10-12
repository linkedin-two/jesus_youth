import Field from './Field';

export default function StepConsent({
  data,
  errors,
  onChange,
  submitting,
  submitError,
  groupMembers = [],
  onAddAnotherPerson,
  onRemoveGroupMember
}) {
  const set = (name) => (e) => onChange(name, e.target.value);

  const coord1Name = import.meta.env.VITE_COORDINATOR_1_NAME || 'ABRAHAM JOSEPH';
  const coord1Phone = import.meta.env.VITE_COORDINATOR_1_PHONE || '9567113383';
  const coord2Name = import.meta.env.VITE_COORDINATOR_2_NAME || 'ANCY ALEXANDER';
  const coord2Phone = import.meta.env.VITE_COORDINATOR_2_PHONE || '8089012363';

  const totalPeopleCount = groupMembers.length + 1;
  const totalAmount = totalPeopleCount * 100;

  return (
    <div className="step">
      <h2>Emergency Contact &amp; Confirmation</h2>
      <p className="hint">Final details before completing registration 🛡️</p>

      {/* Group Summary Card */}
      {groupMembers.length > 0 && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 12,
          padding: 12,
          marginBottom: 16
        }}>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: '#1d4ed8', marginBottom: 6 }}>
            👥 Group Delegates Summary ({totalPeopleCount} Delegates Total — ₹{totalAmount}):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {groupMembers.map((member, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fff',
                padding: '6px 10px',
                borderRadius: 8,
                fontSize: 10.5,
                border: '1px solid var(--ink-200)'
              }}>
                <div>
                  <strong>{idx + 1}. {member.name} {member.surname}</strong>
                  <span style={{ color: 'var(--ink-500)', marginLeft: 6 }}>({member.phone})</span>
                </div>
                {onRemoveGroupMember && (
                  <button
                    type="button"
                    onClick={() => onRemoveGroupMember(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--red-700)',
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: '2px 6px'
                    }}
                    title="Remove Person"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <div style={{
              fontSize: 10.5,
              fontWeight: 'bold',
              color: 'var(--jy-crimson)',
              padding: '4px 6px'
            }}>
              ⭐ Delegate #{totalPeopleCount}: {data.name || 'Current Person'} {data.surname || ''}
            </div>
          </div>
        </div>
      )}

      <Field label="Emergency Contact Name">
        <input
          type="text"
          value={data.emergencyName}
          onChange={set('emergencyName')}
          placeholder="Parent / Guardian name"
          autoComplete="name"
          autoCapitalize="words"
        />
      </Field>

      <Field label="Emergency Contact Phone">
        <input
          type="tel"
          value={data.emergencyPhone}
          onChange={set('emergencyPhone')}
          placeholder="+91 98765 43210"
          inputMode="tel"
        />
      </Field>

      <label className={`consent ${data.dataConsent ? 'selected' : ''}`}>
        <input
          type="checkbox"
          checked={data.dataConsent}
          onChange={(e) => onChange('dataConsent', e.target.checked)}
        />
        <span>
          <strong>Registration Agreement *</strong> — I confirm my details are accurate and agree to KCYM VITAMIN C PAROPPADY registration / SMYM-KCYM storing my information for event coordination.
        </span>
      </label>
      {errors.dataConsent && <div className="field-error">{errors.dataConsent}</div>}

      {/* Add Another Person Button */}
      {onAddAnotherPerson && (
        <div style={{
          marginTop: 16,
          marginBottom: 16,
          padding: 12,
          borderRadius: 12,
          background: 'rgba(217, 4, 41, 0.05)',
          border: '1px dashed rgba(217, 4, 41, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--ink-800)', marginBottom: 4 }}>
            Want to add another person before payment? 👥
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onAddAnotherPerson}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: 11.5,
              fontWeight: 'bold',
              color: 'var(--jy-crimson)',
              border: '1.5px solid var(--jy-crimson)',
              borderRadius: 8
            }}
          >
            ➕ Add Another Person ({totalPeopleCount} added so far — ₹{totalAmount})
          </button>
        </div>
      )}

      <div className="contacts-card">
        <h4>Need Help or Details? Contact Coordinators:</h4>
        <div className="contact-item">
          <span>📞 <strong>{coord1Name}</strong>: <a href={`tel:${coord1Phone}`}>{coord1Phone}</a></span>
        </div>
        <div className="contact-item">
          <span>📞 <strong>{coord2Name}</strong>: <a href={`tel:${coord2Phone}`}>{coord2Phone}</a></span>
        </div>
      </div>

      {submitError && <div className="error-banner">{submitError}</div>}
    </div>
  );
}
