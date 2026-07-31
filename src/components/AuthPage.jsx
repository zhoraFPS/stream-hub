import React, { useState } from 'react';
import { User, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

// VfL Bochum Crest – Sharp Square SVG
function VflCrest() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="VfL Bochum">
      <rect width="56" height="56" fill="#0055B8" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <path d="M11 15 L21 41 L28 23 L35 41 L45 15" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter" fill="none"/>
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
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <VflCrest />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc', letterSpacing: '0.04em', textTransform: 'uppercase' }}>VfL Bochum TV</h1>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {mode === 'login' ? 'Anmelden für exklusive Inhalte' : 'Kostenlosen Account erstellen'}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', padding: 28 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: 3, marginBottom: 24 }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{ flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
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
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary"
              style={{ width: '100%', padding: '12px 0', fontSize: 13, fontWeight: 800, justifyContent: 'center', marginTop: 4,
                opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'BITTE WARTEN...' : mode === 'login' ? 'ANMELDEN' : 'ACCOUNT ERSTELLEN'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginTop: 20, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Das offizielle Media-Portal des VfL Bochum 1848.
        </p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, style, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#64748b', pointerEvents: 'none' }} />
      <input
        className="input-search"
        style={{ width: '100%', paddingLeft: 38, ...style }}
        {...props}
      />
    </div>
  );
}
