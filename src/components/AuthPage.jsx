import React, { useState } from 'react';
import Icon from './ui/Icon';

export default function AuthPage({ onAuth, onBack }) {
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
      if (!res.ok) throw new Error(data.error || 'Anmeldung fehlgeschlagen.');
      onAuth(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 'var(--space-s)' }}>
        <button type="button" className="b-button b-button--secondary b-button--s" onClick={onBack}>
          <Icon name="arrow-left" size={16} />
          Zurück
        </button>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-s)',
      }}>
        <div style={{ width: '100%', maxWidth: 460 }}>
          <div style={{ marginBottom: 'var(--space-m)' }}>
            <span className="b-kicker">1848TV</span>
            <h1 className="b-heading b-heading--600" style={{ marginBlock: 'var(--space-3xs)' }}>
              {mode === 'login' ? 'Anmelden' : 'Konto anlegen'}
            </h1>
            <p className="b-copy">
              {mode === 'login'
                ? 'Für die Redaktion: Videos hochladen, Streams starten, Mediathek pflegen.'
                : 'Lege ein Redaktionskonto an, um Videos zu veröffentlichen.'}
            </p>
          </div>

          <div className="b-panel b-panel--l">
            <div className="b-chips" style={{ marginBottom: 'var(--space-s)' }}>
              {[
                { value: 'login', label: 'Anmelden' },
                { value: 'register', label: 'Registrieren' },
              ].map(tab => (
                <button
                  key={tab.value}
                  type="button"
                  className={`b-chip${mode === tab.value ? ' --is-active' : ''}`}
                  aria-pressed={mode === tab.value}
                  onClick={() => { setMode(tab.value); setError(''); }}
                >
                  <span className="b-chip__label">{tab.label}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
              {mode === 'register' ? (
                <>
                  <div className="b-field">
                    <label className="b-label" htmlFor="auth-username">Benutzername</label>
                    <input id="auth-username" className="b-input" type="text" autoComplete="username"
                      value={form.username} onChange={set('username')} required />
                  </div>
                  <div className="b-field">
                    <label className="b-label" htmlFor="auth-email">E-Mail-Adresse</label>
                    <input id="auth-email" className="b-input" type="email" autoComplete="email"
                      value={form.email} onChange={set('email')} required />
                  </div>
                </>
              ) : (
                <div className="b-field">
                  <label className="b-label" htmlFor="auth-login">Benutzername oder E-Mail</label>
                  <input id="auth-login" className="b-input" type="text" autoComplete="username"
                    value={form.login} onChange={set('login')} required />
                </div>
              )}

              <div className="b-field">
                <label className="b-label" htmlFor="auth-password">Passwort</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="auth-password"
                    className="b-input"
                    type={showPw ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={form.password}
                    onChange={set('password')}
                    required
                    style={{ paddingRight: 'var(--space-2xl)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{
                      position: 'absolute',
                      right: 'var(--space-2xs)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 'var(--step--2)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                      color: 'var(--color-alpha-600)',
                    }}
                  >
                    {showPw ? 'Verbergen' : 'Zeigen'}
                  </button>
                </div>
              </div>

              {error && <div className="b-notice b-notice--error">{error}</div>}

              <button type="submit" className="b-button b-button--primary b-button--block" disabled={loading}>
                {loading ? 'Einen Moment…' : mode === 'login' ? 'Anmelden' : 'Konto anlegen'}
              </button>
            </form>
          </div>

          <p className="b-meta-line__item" style={{ display: 'block', marginTop: 'var(--space-s)' }}>
            Medienportal des VfL Bochum 1848
          </p>
        </div>
      </div>
    </div>
  );
}
