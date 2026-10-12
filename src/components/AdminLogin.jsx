import { useState } from 'react';
import Field from './Field';

export default function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const adminUser = import.meta.env.VITE_ADMIN_USER || 'admin';
    const adminPass = import.meta.env.VITE_ADMIN_PASS || 'admin';
    if (username.trim() === adminUser && password.trim() === adminPass) {
      setError('');
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
            placeholder="admin"
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

        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 8 }}>
          Login to Admin Portal →
        </button>
      </form>
    </div>
  );
}
