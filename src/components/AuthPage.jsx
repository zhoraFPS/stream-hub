import React, { useState } from 'react';
import { Radio, User, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', email: '', password: '', login: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { login: form.login, password: form.password }
        : { username: form.username, email: form.email, password: form.password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler');
      onAuth(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg-main)' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #0055b8, #0068e0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Radio style={{ width: 28, height: 28, color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>StreamHub</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
            {mode === 'login' ? 'Anmelden und live gehen' : 'Kostenlosen Account erstellen'}
          </p>
        </div>

        {/* Tab Switch */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: 10, padding: 4, marginBottom: 24, border: '1px solid var(--border)' }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s ease',
                background: mode === m ? '#0055b8' : 'transparent',
                color: mode === m ? '#fff' : '#64748b' }}>
              {m === 'login' ? 'Anmelden' : 'Registrieren'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div style={{ position: 'relative' }}>
              <User style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#475569', pointerEvents: 'none' }} />
              <input type="text" placeholder="Username (a-z, 0-9, _)" value={form.username} onChange={set('username')} required
                style={inputStyle} />
            </div>
          )}

          {mode === 'register' && (
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#475569', pointerEvents: 'none' }} />
              <input type="email" placeholder="Email-Adresse" value={form.email} onChange={set('email')} required
                style={inputStyle} />
            </div>
          )}

          {mode === 'login' && (
            <div style={{ position: 'relative' }}>
              <User style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#475569', pointerEvents: 'none' }} />
              <input type="text" placeholder="Username oder Email" value={form.login} onChange={set('login')} required
                style={inputStyle} />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#475569', pointerEvents: 'none' }} />
            <input type={showPw ? 'text' : 'password'} placeholder="Passwort" value={form.password} onChange={set('password')} required
              style={{ ...inputStyle, paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPw(s => !s)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex' }}>
              {showPw ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
            </button>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#ef4444' }}>
              <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary"
            style={{ padding: '12px 0', fontSize: 14, fontWeight: 700, borderRadius: 9, opacity: loading ? 0.7 : 1 }}>
            {loading ? '…' : mode === 'login' ? 'Anmelden' : 'Account erstellen'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#475569' }}>
          {mode === 'login' ? 'Noch keinen Account?' : 'Bereits registriert?'}
          {' '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0055b8', fontWeight: 600, fontSize: 12 }}>
            {mode === 'login' ? 'Jetzt registrieren' : 'Anmelden'}
          </button>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 9,
  padding: '11px 12px 11px 40px',
  fontSize: 14,
  color: '#f8fafc',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
};
