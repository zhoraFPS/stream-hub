import React, { useState } from 'react';

export default function SettingsPage({ currentUser, authToken, onBack, onUserUpdate }) {
  const [streamKey, setStreamKey] = useState(currentUser?.stream_key || '');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [displayName, setDisplayName] = useState(currentUser?.display_name || currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const copyKey = () => {
    navigator.clipboard.writeText(streamKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateKey = async () => {
    if (!confirm('Einen neuen Stream Key generieren? Der alte Key funktioniert dann nicht mehr!')) return;
    setRegenerating(true);
    try {
      const res = await fetch('/api/auth/stream-key/regenerate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.streamKey) {
        setStreamKey(data.streamKey);
        onUserUpdate?.({ ...currentUser, stream_key: data.streamKey });
      }
    } catch {}
    setRegenerating(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ displayName, bio }),
      });
      onUserUpdate?.({ ...currentUser, display_name: displayName, bio });
      setSaveMsg('PROFIL GESPEICHERT');
    } catch {
      setSaveMsg('FEHLER BEIM SPEICHERN');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const localIp = window.location.hostname;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 20px 48px' }}>
      <div style={{ padding: '8px 0 24px' }}>
        <button onClick={onBack} className="btn-secondary" style={{ fontSize: 11 }}>
          ← ZURÜCK
        </button>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.04em' }}>EINSTELLUNGEN</h1>

      {/* Stream Setup */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase' }}>STREAM SETUP</h2>
          <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>OBS-ZUGANGSDATEN FÜR DEINEN KANAL</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>RTMP SERVER URL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={`rtmp://${localIp}:1936/live`}
                style={{ ...readonlyInputStyle, flex: 1 }} />
              <button onClick={() => { navigator.clipboard.writeText(`rtmp://${localIp}:1936/live`); }}
                className="btn-secondary" style={{ fontSize: 11 }}>
                KOPIEREN
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>STREAM KEY</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input readOnly type={showKey ? 'text' : 'password'} value={streamKey}
                  style={{ ...readonlyInputStyle, width: '100%', paddingRight: 80 }} />
                <button onClick={() => setShowKey(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 10, fontWeight: 900 }}>
                  {showKey ? 'VERBERGEN' : 'ZEIGEN'}
                </button>
              </div>
              <button onClick={copyKey} className="btn-secondary" style={{ fontSize: 11 }}>
                {copied ? 'KOPIERT' : 'KOPIEREN'}
              </button>
              <button onClick={regenerateKey} disabled={regenerating} className="btn-secondary" style={{ fontSize: 11 }}>
                {regenerating ? 'LÄDT...' : 'NEU GENERIEREN'}
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#ef4444', marginTop: 8, fontWeight: 800, textTransform: 'uppercase' }}>
              TEILE DEINEN STREAM KEY NIE MIT ANDEREN!
            </p>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.04)', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
            <div style={{ marginBottom: 8, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              OBS STUDIO EINSTELLUNGEN
            </div>
            <div><span style={{ color: '#64748b' }}>SETTINGS → STREAM → SERVICE:</span> CUSTOM</div>
            <div><span style={{ color: '#64748b' }}>SERVER:</span> <code style={{ color: '#ffffff', fontWeight: 700 }}>rtmp://{localIp}:1936/live</code></div>
            <div><span style={{ color: '#64748b' }}>STREAM KEY:</span> <span style={{ color: '#ffffff', fontWeight: 700 }}>DEIN PERSÖNLICHER KEY (OBEN)</span></div>
          </div>
        </div>
      </div>

      {/* Profile Settings */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', marginBottom: 16, textTransform: 'uppercase' }}>PROFIL</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>ANZEIGENAME</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={32}
              placeholder="Wie soll dein Name angezeigt werden?"
              className="input-search"
              style={{ width: '100%' }} />
          </div>

          <div>
            <label style={labelStyle}>BIO</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={200} rows={3}
              placeholder="Erzähl etwas über deinen Kanal…"
              className="input-search"
              style={{ width: '100%', resize: 'vertical', lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={saveProfile} disabled={saving} className="btn-primary"
              style={{ fontSize: 12, padding: '10px 20px' }}>
              {saving ? 'SPEICHERT…' : 'SPEICHERN'}
            </button>
            {saveMsg && <span style={{ fontSize: 12, fontWeight: 900, color: saveMsg.includes('ERFOLGREICH') ? '#22c55e' : '#ef4444' }}>{saveMsg}</span>}
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', marginBottom: 16, textTransform: 'uppercase' }}>ACCOUNT</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12, color: '#64748b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>USERNAME</span>
            <span style={{ color: '#ffffff', fontWeight: 800 }}>@{currentUser?.username}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>EMAIL</span>
            <span style={{ color: '#ffffff', fontWeight: 700 }}>{currentUser?.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>DABEI SEIT</span>
            <span style={{ color: '#ffffff' }}>{currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString('de-DE') : '–'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const sectionStyle = {
  background: 'var(--bg-card)',
  padding: 24,
  marginBottom: 20,
};

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 900,
  color: '#64748b',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const readonlyInputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: 'none',
  padding: '10px 14px',
  fontSize: 12,
  color: '#ffffff',
  outline: 'none',
  fontFamily: 'ui-monospace, monospace',
  boxSizing: 'border-box',
};
