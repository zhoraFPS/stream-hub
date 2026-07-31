import React, { useState } from 'react';
import { User, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

// VfL Bochum Crest – SVG inline
function VflCrest() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="VfL Bochum">
      <rect width="56" height="56" rx="14" fill="#0055B8"/>
      {/* V shape */}
      <path d="M10 14 L19 38 L28 20 L37 38 L46 14" stroke="#FFD700" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <VflCrest />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>VfL Bochum TV</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
            {mode === 'login' ? 'Anmelden für exklusive Inhalte' : 'Kostenlosen Account erstellen'}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: mode === m ? 'var(--accent)' : 'none',
                  color: mode === m ? '#fff' : '#64748b',
                  transition: 'all 0.15s' }}>
                {m === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <>
                <Field icon={User} type="text" placeholder="Benutzername" value={form.username} onChange={set('username')} required />
                <Field icon={Mail} type="email" placeholder="E-Mail-Adresse" value={form.email} onChange={set('email')} required />
              </>
            )}
            {mode === 'login' && (
              <Field icon={User} type="text" placeholder="Benutzername oder E-Mail" value={form.login} onChange={set('login')} required />
            )}
            <div style={{ position: 'relative' }}>
              <Field
                icon={Lock}
                type={showPw ? 'text' : 'password'}
                placeholder="Passwort"
                value={form.password}
                onChange={set('password')}
                required
                style={{ paddingRight: 42 }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, color: '#ef4444' }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary"
              style={{ width: '100%', padding: '11px 0', fontSize: 14, fontWeight: 700, justifyContent: 'center', marginTop: 4,
                opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Bitte warten…' : mode === 'login' ? 'Anmelden' : 'Account erstellen'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#334155', marginTop: 20 }}>
          Nur für autorisierte VfL-Mitarbeiter und Redakteure.
        </p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, style, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#475569', pointerEvents: 'none' }} />
      <input
        className="input-search"
        style={{ width: '100%', paddingLeft: 38, ...style }}
        {...props}
      />
    </div>
  );
}
