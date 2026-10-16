import { useState, useEffect } from 'react';
import './App.css';
import StepWelcome from './components/StepWelcome';
import StepStatusView from './components/StepStatusView';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import UpiCheckPage from './components/UpiCheckPage';
import BackgroundPoster from './components/BackgroundPoster';
import { clearDraft } from './utils/storage';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://jesus-youth-ru8k.onrender.com').replace(/\/$/, '');
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || 'vitaminc_secret_2026';

export default function App() {
  const [step, setStep] = useState(0); 
  // Step key:
  // -3 = UPI Inspector Tool, -2 = Admin Dashboard, -1 = Admin Login, 0 = Registration Closed Landing, 6 = Delegate Pass View
  const [userRegistration, setUserRegistration] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [mvpSubmissions, setMvpSubmissions] = useState([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminToken, setAdminToken] = useState(ADMIN_KEY);

  // Clear any previous local form drafts
  useEffect(() => {
    clearDraft();
  }, []);

  // Check URL pathname, hash, or search query for /admin or /upi-check on load
  useEffect(() => {
    const href = window.location.href.toLowerCase();
    if (href.includes('/upi-check') || href.includes('#upi-check') || href.includes('?upi-check')) {
      setStep(-3);
    } else if (href.includes('/admin') || href.includes('#admin') || href.includes('?admin')) {
      setStep(-1);
    }
  }, []);

  // Scroll to top on step change
  useEffect(() => {
    const body = document.querySelector('.step-body');
    if (body) body.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Lookup existing registration pass for registered delegates
  const handleLookupUniqueId = async (searchQuery) => {
    setLookupError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/status/${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.registered && json.registration) {
          setUserRegistration(json.registration);
          setStep(6);
          return;
        }
      }
      setLookupError('No delegate registration found with that ID or Phone number. Please contact event coordinators.');
    } catch (err) {
      console.warn('Status lookup request failed:', err);
      setLookupError('Network error checking status. Please try again or contact event coordinators.');
    }
  };

  // Fetch all registrations from MongoDB for Admin Dashboard
  const fetchAdminRegistrations = async (keyOverride) => {
    const key = keyOverride || adminToken || ADMIN_KEY;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/registrations`, {
        headers: { 'x-admin-key': key }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMvpSubmissions(data);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch registrations from backend, using local state:', err);
    }
  };

  // Admin Actions: Approve, Reject, or Delete a specific registration record
  const handleAdminRecordAction = async (recordId, action) => {
    const key = adminToken || ADMIN_KEY;
    try {
      await fetch(`${API_BASE_URL}/api/admin/record-action/${recordId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': key
        },
        body: JSON.stringify({ action: action }),
      });
    } catch (e) {
      console.warn('FastAPI admin action API offline, updating local state:', e);
    }

    // Update local state immediately for instant UI feedback
    if (action === 'DELETE') {
      setMvpSubmissions((prev) => prev.filter((item) => item.id !== recordId));
    } else {
      setMvpSubmissions((prev) =>
        prev.map((item) =>
          item.id === recordId ? { ...item, registrationStatus: action } : item
        )
      );
    }

    // Re-fetch from MongoDB to ensure admin dashboard reflects the real database state
    await fetchAdminRegistrations();
  };

  return (
    <div className="app">
      <BackgroundPoster />
      <div className="card">

        {/* Header Bar */}
        <div className="header">
          <div className="logo">✝</div>
          <h1>KCYM SMYM PAROPPADY MEKHALA</h1>
          <p className="subtitle">VITAMIN C</p>

          <div className="header-actions" style={{ display: 'flex', gap: 6 }}>
            {step !== 0 ? (
              <button
                type="button"
                className="btn-icon-tag"
                onClick={() => setStep(0)}
              >
                Home 🏠
              </button>
            ) : (
              <button
                type="button"
                className="btn-icon-tag"
                onClick={() => setStep(isAdminLoggedIn ? -2 : -1)}
              >
                Admin 🔐
              </button>
            )}
          </div>
        </div>

        {/* Malayalam Banner Announcement */}
        <div className="malayalam-banner">
          <p>
            ക്രിസ്തുവിൽ ജീവിക്കാം! വിശ്വാസത്തിൽ ജ്വലിക്കം! ആവേശത്തിൽ ഒന്നിക്കാം!
          </p>
          <div className="tagline" style={{ marginTop: 4, fontStyle: 'italic', fontWeight: 700 }}>
            Not just a Meeting ....... It's a Life Changing Dose
          </div>
        </div>

        {/* Step Body Container */}
        <div className="step-body">
          {/* Step -3: Standalone UPI Screenshot Inspector (/upi-check) */}
          {step === -3 && (
            <UpiCheckPage
              onBackToForm={() => setStep(0)}
            />
          )}

          {/* Step -1: Admin Login */}
          {step === -1 && (
            <AdminLogin
              apiBaseUrl={API_BASE_URL}
              onLoginSuccess={(receivedKey) => {
                if (receivedKey) setAdminToken(receivedKey);
                setIsAdminLoggedIn(true);
                fetchAdminRegistrations(receivedKey);
                setStep(-2);
              }}
            />
          )}

          {/* Step -2: Admin Portal Dashboard */}
          {step === -2 && (
            <AdminDashboard
              submissions={mvpSubmissions}
              onRecordAction={handleAdminRecordAction}
              onRefresh={() => fetchAdminRegistrations()}
              onLogout={() => {
                setIsAdminLoggedIn(false);
                setStep(0);
              }}
              onBackToForm={() => setStep(0)}
            />
          )}

          {/* Step 0: Registration Closed & Event Info */}
          {step === 0 && (
            <StepWelcome
              onOpenAdmin={() => setStep(isAdminLoggedIn ? -2 : -1)}
              onLookupUniqueId={handleLookupUniqueId}
              lookupError={lookupError}
              setLookupError={setLookupError}
            />
          )}

          {/* Step 6: Status & Delegate Pass View */}
          {step === 6 && userRegistration && (
            <StepStatusView
              registration={userRegistration}
              onRefreshStatus={() => handleLookupUniqueId(userRegistration.regId || userRegistration.phone)}
              onGoToWelcome={() => setStep(0)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
