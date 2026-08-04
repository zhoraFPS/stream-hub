import React, { useState } from 'react';
import SectionTitle from './ui/SectionTitle';
import Icon from './ui/Icon';
import { formatDate } from '../utils/formatters';

export default function SettingsPage({ currentUser, authToken, onBack, onUserUpdate }) {
  const [streamKey, setStreamKey] = useState(currentUser?.stream_key || '');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  const [displayName, setDisplayName] = useState(currentUser?.display_name || currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // { kind, text }

  const localIp = window.location.hostname;
  const rtmpUrl = `rtmp://${localIp}:1936/live`;

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const regenerateKey = async () => {
    if (!confirm('Neuen Stream Key erzeugen? Laufende OBS-Konfigurationen mit dem alten Key funktionieren danach nicht mehr.')) return;
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
        setNotice({ kind: 'success', text: 'Neuer Stream Key erzeugt. Trag ihn in OBS ein.' });
      } else {
        setNotice({ kind: 'error', text: 'Der Key konnte nicht erneuert werden.' });
      }
    } catch {
      setNotice({ kind: 'error', text: 'Der Key konnte nicht erneuert werden.' });
    } finally {
      setRegenerating(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ displayName, bio }),
      });
      if (!res.ok) throw new Error();
      onUserUpdate?.({ ...currentUser, display_name: displayName, bio });
      setNotice({ kind: 'success', text: 'Profil gespeichert.' });
    } catch {
      setNotice({ kind: 'error', text: 'Das Profil konnte nicht gespeichert werden.' });
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  return (
    <div>
      <div style={{ paddingBlockEnd: 'var(--space-s)' }}>
        <button type="button" className="b-button b-button--secondary b-button--s" onClick={onBack}>
          <Icon name="arrow-left" size={16} />
          Zur Mediathek
        </button>
      </div>

      <h1 className="b-heading b-heading--600" style={{ marginBlockEnd: 'var(--space-m)' }}>
        Einstellungen
      </h1>

      {/* Stream */}
      <section className="b-section">
        <SectionTitle title="Stream" />
        <div className="b-panel b-panel--l" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
          <div className="b-field">
            <label className="b-label" htmlFor="rtmp-url">RTMP-Server</label>
            <div style={{ display: 'flex', gap: 'var(--space-3xs)' }}>
              <input id="rtmp-url" className="b-input b-input--mono" readOnly value={rtmpUrl} />
              <button type="button" className="b-button b-button--secondary b-button--s"
                onClick={() => copy(rtmpUrl, 'url')}>
                {copied === 'url' ? 'Kopiert' : 'Kopieren'}
              </button>
            </div>
          </div>

          <div className="b-field">
            <label className="b-label" htmlFor="stream-key">Stream Key</label>
            <div style={{ display: 'flex', gap: 'var(--space-3xs)', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 220px' }}>
                <input
                  id="stream-key"
                  className="b-input b-input--mono"
                  readOnly
                  type={showKey ? 'text' : 'password'}
                  value={streamKey}
                  style={{ paddingRight: 'var(--space-2xl)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(s => !s)}
                  style={{
                    position: 'absolute', right: 'var(--space-2xs)', top: '50%',
                    transform: 'translateY(-50%)', fontSize: 'var(--step--2)', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-alpha-600)',
                  }}
                >
                  {showKey ? 'Verbergen' : 'Zeigen'}
                </button>
              </div>
              <button type="button" className="b-button b-button--secondary b-button--s"
                onClick={() => copy(streamKey, 'key')}>
                {copied === 'key' ? 'Kopiert' : 'Kopieren'}
              </button>
              <button type="button" className="b-button b-button--ghost b-button--s"
                onClick={regenerateKey} disabled={regenerating}>
                {regenerating ? 'Wird erzeugt…' : 'Neu erzeugen'}
              </button>
            </div>
            <p className="b-notice b-notice--error" style={{ marginTop: 'var(--space-2xs)' }}>
              Der Stream Key gehört nur dir. Wer ihn hat, kann auf deinem Kanal senden.
            </p>
          </div>

          <div className="b-panel b-panel--bare">
            <div className="b-label" style={{ marginBottom: 'var(--space-2xs)' }}>OBS Studio einrichten</div>
            <div className="b-copy" style={{ display: 'grid', gap: '4px' }}>
              <div>Einstellungen → Stream → Dienst: <strong>Benutzerdefiniert</strong></div>
              <div>Server: <code className="b-input--mono">{rtmpUrl}</code></div>
              <div>Stream Key: dein persönlicher Key von oben</div>
            </div>
          </div>
        </div>
      </section>

      {/* Profil */}
      <section className="b-section">
        <SectionTitle title="Profil" />
        <div className="b-panel b-panel--l" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
          <div className="b-field">
            <label className="b-label" htmlFor="display-name">Anzeigename</label>
            <input id="display-name" className="b-input" type="text" maxLength={32}
              value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="So erscheint dein Kanal in der Mediathek" />
          </div>

          <div className="b-field">
            <label className="b-label" htmlFor="bio">Über den Kanal</label>
            <textarea id="bio" className="b-input" rows={3} maxLength={200}
              value={bio} onChange={e => setBio(e.target.value)}
              placeholder="Was zeigst du hier?" />
          </div>

          <div className="b-row">
            <button type="button" className="b-button b-button--primary b-button--s"
              onClick={saveProfile} disabled={saving}>
              {saving ? 'Wird gespeichert…' : 'Speichern'}
            </button>
            {notice && (
              <span className={`b-notice b-notice--${notice.kind}`}>{notice.text}</span>
            )}
          </div>
        </div>
      </section>

      {/* Konto */}
      <section className="b-section">
        <SectionTitle title="Konto" />
        <div className="b-panel b-panel--l">
          <dl style={{ display: 'grid', gap: 'var(--space-2xs)' }}>
            <Row label="Benutzername" value={`@${currentUser?.username}`} />
            <Row label="E-Mail" value={currentUser?.email} />
            <Row label="Dabei seit" value={formatDate(currentUser?.created_at) || '—'} />
          </dl>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-s)' }}>
      <dt className="b-label">{label}</dt>
      <dd className="b-copy b-copy--front">{value}</dd>
    </div>
  );
}
