import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, Copy, Check, Eye, EyeOff, Save, Radio, Monitor, AlertTriangle } from 'lucide-react';

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
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '12px 16px 48px' }}>
      <div style={{ padding: '8px 0 20px' }}>
        <button onClick={onBack} className="btn-secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> ZURÜCK
        </button>
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 900, color: '#f8fafc', marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Einstellungen</h1>

      {/* Stream Setup */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, background: '#0055b8', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Radio style={{ width: 18, height: 18, color: '#fff' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 900, color: '#f8fafc', textTransform: 'uppercase' }}>Stream Setup</h2>
            <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>OBS-Zugangsdaten für deinen Kanal</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>RTMP Server URL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={`rtmp://${localIp}:1936/live`}
                style={{ ...readonlyInputStyle, flex: 1 }} />
              <button onClick={() => { navigator.clipboard.writeText(`rtmp://${localIp}:1936/live`); }}
                style={iconBtnStyle} title="Kopieren">
                <Copy style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Stream Key</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input readOnly type={showKey ? 'text' : 'password'} value={streamKey}
                  style={{ ...readonlyInputStyle, width: '100%', paddingRight: 40 }} />
                <button onClick={() => setShowKey(s => !s)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                  {showKey ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                </button>
              </div>
              <button onClick={copyKey} style={iconBtnStyle} title="Kopieren">
                {copied ? <Check style={{ width: 15, height: 15, color: '#22c55e' }} /> : <Copy style={{ width: 15, height: 15 }} />}
              </button>
              <button onClick={regenerateKey} disabled={regenerating} style={iconBtnStyle} title="Neu generieren">
                <RefreshCw style={{ width: 15, height: 15, animation: regenerating ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
              <AlertTriangle size={12} /> Teile deinen Stream Key nie mit anderen!
            </p>
          </div>

          <div style={{ padding: '14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase' }}>
              <Monitor style={{ width: 14, height: 14, color: '#0055b8' }} /> OBS Studio Einstellungen
            </div>
            <div><span style={{ color: '#64748b' }}>Settings → Stream → Service:</span> Custom</div>
            <div><span style={{ color: '#64748b' }}>Server:</span> <code style={{ color: '#f8fafc', fontWeight: 700 }}>rtmp://{localIp}:1936/live</code></div>
            <div><span style={{ color: '#64748b' }}>Stream Key:</span> <span style={{ color: '#f8fafc', fontWeight: 700 }}>Dein persönlicher Key (oben)</span></div>
          </div>
        </div>
      </div>

      {/* Profile Settings */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 14, fontWeight: 900, color: '#f8fafc', marginBottom: 16, textTransform: 'uppercase' }}>Profil</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Anzeigename</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={32}
              placeholder="Wie soll dein Name angezeigt werden?"
              className="input-search"
              style={{ width: '100%' }} />
          </div>

          <div>
            <label style={labelStyle}>Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={200} rows={3}
              placeholder="Erzähl etwas über deinen Kanal…"
              className="input-search"
              style={{ width: '100%', resize: 'vertical', lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={saveProfile} disabled={saving} className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, padding: '9px 18px' }}>
              <Save style={{ width: 14, height: 14 }} />
              {saving ? 'SPEICHERT…' : 'SPEICHERN'}
            </button>
            {saveMsg && <span style={{ fontSize: 12, fontWeight: 800, color: saveMsg.includes('ERFOLGREICH') ? '#22c55e' : '#ef4444' }}>{saveMsg}</span>}
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 14, fontWeight: 900, color: '#f8fafc', marginBottom: 14, textTransform: 'uppercase' }}>Account</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, color: '#64748b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>Username</span>
            <span style={{ color: '#f8fafc', fontWeight: 700 }}>@{currentUser?.username}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>Email</span>
            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{currentUser?.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>Dabei seit</span>
            <span style={{ color: '#f8fafc' }}>{currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString('de-DE') : '–'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const sectionStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-strong)',
  padding: 20,
  marginBottom: 16,
};

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 800,
  color: '#64748b',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const readonlyInputStyle = {
  width: '100%',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  padding: '9px 12px',
  fontSize: 12,
  color: '#f8fafc',
  outline: 'none',
  fontFamily: 'ui-monospace, monospace',
  boxSizing: 'border-box',
};

const iconBtnStyle = {
  flexShrink: 0,
  width: 38,
  height: 38,
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#94a3b8',
  transition: 'all 0.15s',
};
