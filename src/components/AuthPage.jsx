import React, { useState } from 'react';

// VfL Bochum TV Logo – Square Text Badge
function VflCrest() {
  return (
    <div style={{ width: 64, height: 64, background: '#0055B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#ffffff', letterSpacing: '0.06em' }}>
      VfL
    </div>
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
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <VflCrest />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#ffffff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>VfL Bochum 1848 TV</h1>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            {mode === 'login' ? 'ANMELDEN FÜR EXKLUSIVE INHALTE' : 'KOSTENLOSEN ACCOUNT ERSTELLEN'}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-card)', padding: 32 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', padding: 4, marginBottom: 24 }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{ flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
                  background: mode === m ? 'var(--accent)' : 'none',
                  color: mode === m ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s' }}>
                {m === 'login' ? 'ANMELDEN' : 'REGISTRIEREN'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <>
                <div>
                  <label style={labelStyle}>BENUTZERNAME</label>
                  <input type="text" placeholder="BENUTZERNAME" value={form.username} onChange={set('username')} required className="input-search" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={labelStyle}>E-MAIL-ADRESSE</label>
                  <input type="email" placeholder="E-MAIL" value={form.email} onChange={set('email')} required className="input-search" style={{ width: '100%' }} />
                </div>
              </>
            )}
            {mode === 'login' && (
              <div>
                <label style={labelStyle}>LOGIN</label>
                <input type="text" placeholder="BENUTZERNAME ODER E-MAIL" value={form.login} onChange={set('login')} required className="input-search" style={{ width: '100%' }} />
              </div>
            )}
            <div>
              <label style={labelStyle}>PASSWORT</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="PASSWORT"
                  value={form.password}
                  onChange={set('password')}
                  required
                  className="input-search"
                  style={{ width: '100%', paddingRight: 70 }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 11, fontWeight: 800 }}>
                  {showPw ? 'VERBERGEN' : 'ZEIGEN'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px 14px', background: '#dc2626', fontSize: 12, color: '#ffffff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary"
              style={{ width: '100%', padding: '12px 0', fontSize: 13, fontWeight: 900, justifyContent: 'center', marginTop: 8,
                opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'BITTE WARTEN...' : mode === 'login' ? 'ANMELDEN' : 'ACCOUNT ERSTELLEN'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginTop: 24, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
          Das offizielle Media-Portal des VfL Bochum 1848.
        </p>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 800,
  color: '#64748b',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};
