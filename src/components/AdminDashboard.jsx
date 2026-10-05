import React, { useState } from 'react';

export default function AdminDashboard({
  submissions = [],
  onRecordAction,
  onLogout,
  onBackToForm
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('NEW_STUDENTS');
  const [expandedRowId, setExpandedRowId] = useState(null);

  const filtered = submissions.filter((item) => {
    const isNew = item.ocrStatus != null;
    let matchesTab = false;
    const status = item.registrationStatus || 'PENDING';
    if (statusFilter === 'UNFINISHED') {
      matchesTab = status === 'UNFINISHED';
    } else if (statusFilter === 'REJECTED') {
      matchesTab = status === 'REJECTED';
    } else if (statusFilter === 'NEW_STUDENTS') {
      matchesTab = isNew && status !== 'UNFINISHED' && status !== 'REJECTED';
    } else if (statusFilter === 'OLD_STUDENTS') {
      matchesTab = !isNew && status !== 'UNFINISHED' && status !== 'REJECTED';
    }

    const query = search.toLowerCase();
    const matchesQuery =
      (item.regId || item.registration_id || '').toLowerCase().includes(query) ||
      (item.name || '').toLowerCase().includes(query) ||
      (item.surname || '').toLowerCase().includes(query) ||
      (item.parish || '').toLowerCase().includes(query) ||
      (item.diocese || '').toLowerCase().includes(query) ||
      (item.phone || '').toLowerCase().includes(query) ||
      (item.email || '').toLowerCase().includes(query) ||
      (item.registeredBy || '').toLowerCase().includes(query);

    return matchesTab && matchesQuery;
  });

  const countNew = submissions.filter((s) => s.ocrStatus != null && s.registrationStatus !== 'UNFINISHED' && s.registrationStatus !== 'REJECTED').length;
  const countOld = submissions.filter((s) => s.ocrStatus == null && s.registrationStatus !== 'UNFINISHED' && s.registrationStatus !== 'REJECTED').length;
  const countUnfinished = submissions.filter((s) => s.registrationStatus === 'UNFINISHED').length;
  const countRejected = submissions.filter((s) => s.registrationStatus === 'REJECTED').length;

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = [
      'Registration ID', 'Name', 'Surname', 'Parish', 'Diocese', 'Mobile Number',
      'T-Shirt Size', 'Email', 'Registered By / Connected To', 'Status', 'Submitted At'
    ];

    const rows = filtered.map((item) => [
      `"${item.regId || item.registration_id || '100101'}"`,
      `"${item.name || ''}"`,
      `"${item.surname || ''}"`,
      `"${item.parish || ''}"`,
      `"${item.diocese || ''}"`,
      `"${item.phone || ''}"`,
      `"${item.tShirtSize || ''}"`,
      `"${item.email || ''}"`,
      `"${item.registeredBy || 'Primary / Self'}"`,
      `"${item.registrationStatus || 'PENDING'}"`,
      `"${item.submittedAt || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Campus_Meet_Registrations_${statusFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAction = (recordId, action) => {
    if (action === 'DELETE') {
      if (!window.confirm("Are you sure you want to permanently delete this registration record?")) {
        return;
      }
    }
    onRecordAction(recordId, action);
  };

  return (
    <div className="step admin-container">
      <div className="admin-header">
        <h2>Admin Management Portal</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn-secondary" onClick={onBackToForm} style={{ fontSize: 8.5, padding: '4px 8px' }}>
            Form
          </button>
          <button type="button" className="btn-secondary" onClick={onLogout} style={{ fontSize: 8.5, padding: '4px 8px', color: 'var(--red-700)' }}>
            Logout 🔒
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="admin-tabs">
        <button
          type="button"
          className={`tab-btn tab-approved ${statusFilter === 'NEW_STUDENTS' ? 'active' : ''}`}
          onClick={() => { setStatusFilter('NEW_STUDENTS'); setExpandedRowId(null); }}
        >
          New ({countNew})
        </button>
        <button
          type="button"
          className={`tab-btn tab-pending ${statusFilter === 'OLD_STUDENTS' ? 'active' : ''}`}
          onClick={() => { setStatusFilter('OLD_STUDENTS'); setExpandedRowId(null); }}
        >
          Old ({countOld})
        </button>
        <button
          type="button"
          className={`tab-btn ${statusFilter === 'UNFINISHED' ? 'active' : ''}`}
          onClick={() => { setStatusFilter('UNFINISHED'); setExpandedRowId(null); }}
          style={{ background: statusFilter === 'UNFINISHED' ? 'rgba(234, 179, 8, 0.1)' : '', color: statusFilter === 'UNFINISHED' ? '#a16207' : '' }}
        >
          Unfinished ({countUnfinished})
        </button>
        <button
          type="button"
          className={`tab-btn ${statusFilter === 'REJECTED' ? 'active' : ''}`}
          onClick={() => { setStatusFilter('REJECTED'); setExpandedRowId(null); }}
          style={{ background: statusFilter === 'REJECTED' ? 'rgba(239, 68, 68, 0.1)' : '', color: statusFilter === 'REJECTED' ? '#b91c1c' : '' }}
        >
          Rejected ({countRejected})
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          type="text"
          className="admin-search"
          placeholder="Search by Reg ID, name, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="btn-primary"
          onClick={exportCSV}
          style={{ whiteSpace: 'nowrap', flex: '0 0 auto', padding: '6px 10px' }}
        >
          📥 CSV
        </button>
      </div>

      <div className="admin-table-wrapper" style={{ overflowX: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '10%' }}>#</th>
              <th style={{ width: '40%' }}>Name &amp; Phone</th>
              <th style={{ width: '25%' }}>Status</th>
              <th style={{ width: '25%', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--ink-500)', padding: 24, fontSize: 12 }}>
                  No registrations found matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => {
                const itemStatus = (item.registrationStatus || 'PENDING').toUpperCase();
                const itemRegId = item.regId || item.registration_id || '-';
                const registeredByText = item.registeredBy || 'Primary / Self';
                const isGroupChild = !!item.registeredBy && item.registeredBy !== 'Primary / Self';
                const isExpanded = expandedRowId === item.id;

                return (
                  <React.Fragment key={item.id || idx}>
                    <tr style={{ background: isExpanded ? 'rgba(59, 130, 246, 0.05)' : 'transparent', cursor: 'pointer' }} onClick={() => setExpandedRowId(isExpanded ? null : item.id)}>
                      <td style={{ fontWeight: 800, fontSize: 11, color: 'var(--ink-500)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ whiteSpace: 'normal' }}>
                        <strong style={{ fontSize: 12 }}>{item.name} {item.surname}</strong>
                        <div style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 2 }}>{item.phone}</div>
                      </td>
                      <td>
                        <span className={`status-pill pill-${itemStatus.toLowerCase()}`}>
                          {itemStatus}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: 10, padding: '4px 8px', width: 'auto' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRowId(isExpanded ? null : item.id);
                          }}
                        >
                          {isExpanded ? 'Hide Details' : 'Details'}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr style={{ background: 'rgba(59, 130, 246, 0.02)' }}>
                        <td colSpan="4" style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: 11, marginBottom: 12 }}>
                            <div><strong>Reg ID:</strong> <span style={{ color: 'var(--jy-crimson)' }}>{itemRegId}</span></div>
                            <div><strong>Email:</strong> {item.email || '-'}</div>
                            <div><strong>Parish:</strong> {item.parish}</div>
                            <div><strong>Diocese:</strong> {item.diocese}</div>
                            <div><strong>T-Shirt Size:</strong> {item.tShirtSize || 'M'}</div>
                            <div><strong>Registered By:</strong> {isGroupChild ? <span style={{ color: '#1d4ed8' }}>🔗 {registeredByText}</span> : '👤 Self'}</div>
                            {item.ocrStatus && (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <strong>🤖 OCR Status:</strong> 
                                <span style={{ marginLeft: 4, fontWeight: 'bold', color: item.ocrStatus === 'APPROVED' ? '#16a34a' : '#d97706' }}>
                                  {item.ocrStatus}
                                </span>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                            <button
                              type="button"
                              className="btn-approve"
                              style={{ flex: 1, minWidth: '100px', padding: '8px 4px', fontSize: 11, opacity: itemStatus === 'APPROVED' ? 0.5 : 1 }}
                              disabled={itemStatus === 'APPROVED'}
                              onClick={() => handleAction(item.id, 'APPROVED')}
                            >
                              ✓ Approve
                            </button>
                            <button
                              type="button"
                              className="btn-reject"
                              style={{ flex: 1, minWidth: '100px', padding: '8px 4px', fontSize: 11, opacity: itemStatus === 'REJECTED' ? 0.5 : 1 }}
                              disabled={itemStatus === 'REJECTED'}
                              onClick={() => handleAction(item.id, 'REJECTED')}
                            >
                              ✕ Reject
                            </button>
                            <button
                              type="button"
                              className="btn-reject"
                              style={{ flex: 1, minWidth: '100px', padding: '8px 4px', fontSize: 11, background: '#ef4444', color: 'white' }}
                              onClick={() => handleAction(item.id, 'DELETE')}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
