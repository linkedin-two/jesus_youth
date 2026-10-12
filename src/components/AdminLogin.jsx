import { useState } from 'react';
import Field from './Field';

export default function AdminLogin({ onLoginSuccess, apiBaseUrl }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);

    const envUser = (import.meta.env.VITE_ADMIN_USER || '').trim().toLowerCase();
    const envPass = (import.meta.env.VITE_ADMIN_PASS || '').trim();

    // Support configured env credentials, or 'vitaminc', or 'admin'
    const isUserValid = (envUser && u.toLowerCase() === envUser) || u.toLowerCase() === 'vitaminc' || u.toLowerCase() === 'admin';
    const isPassValid = (envPass && p === envPass) || p === 'vitaminc' || p === 'admin';

    // 1. Try backend authentication via /api/admin/login
    const baseUrl = apiBaseUrl || (import.meta.env.VITE_API_BASE_URL || 'https://jesus-youth-ru8k.onrender.com').replace(/\/$/, '');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout so free tier spinup doesn't freeze UI
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        setLoading(false);
        onLoginSuccess(json.admin_key);
        return;
      }
    } catch (err) {
      console.warn('Backend login endpoint check skipped or timed out, evaluating locally:', err);
    }

    // 2. Client fallback verification
    setLoading(false);
    if (isUserValid && isPassValid) {
      onLoginSuccess();
    } else {
      setError('Invalid admin credentials.');
    }
  };

  return (
    <div className="step admin-login-card">
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div className="logo" style={{ width: 44, height: 44, fontSize: 20 }}>🔐</div>
        <h2 style={{ fontSize: 16 }}>Admin Portal Login</h2>
        <p className="hint" style={{ fontSize: 10 }}>Sign in to manage registrations & payments</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Field label="Username">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin / vitaminc"
            autoCapitalize="none"
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {error && <div className="field-error" style={{ marginBottom: 12 }}>{error}</div>}

        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
          {loading ? 'Verifying...' : 'Login to Admin Portal →'}
        </button>
      </form>
    </div>
  );
}
