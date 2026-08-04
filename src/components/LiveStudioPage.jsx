import React, { useState, useRef, useEffect } from 'react';
import SectionTitle from './ui/SectionTitle';
import Chips from './ui/Chips';
import Icon from './ui/Icon';

const MODES = [
  { value: 'phone', label: 'Kamera' },
  { value: 'obs',   label: 'OBS Studio' },
];

export default function LiveStudioPage({ onBack, currentUser, onStreamStarted, onStreamEnded }) {
  const [mode, setMode] = useState('phone');
  const [streamTitle, setStreamTitle] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [isMuted, setIsMuted] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [cameraError, setCameraError] = useState(null);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [copied, setCopied] = useState('');

  const videoPreviewRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const chatEndRef = useRef(null);

  const currentHost = window.location.hostname || 'localhost';
  const currentPort = window.location.port || '5000';
  const rtmpServerUrl = `rtmp://${currentHost}:1936/live`;
  const streamKey = currentUser?.stream_key || '';

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Kamera und Mikrofon freigeben lassen; laufende Spuren vorher beenden.
  const requestCameraAccess = async (targetFacingMode = facingMode) => {
    setCameraError(null);
    try {
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Der Browser gibt die Kamera nur über HTTPS frei. Nutze solange den OBS-Modus.');
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: targetFacingMode }, audio: true });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
      mediaStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.setAttribute('playsinline', 'true');
        videoPreviewRef.current.setAttribute('muted', 'true');
        await videoPreviewRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError(err.message || 'Die Kamera wurde nicht freigegeben.');
    }
  };

  const toggleCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    requestCameraAccess(next);
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
    }
  };

  const startLiveStream = () => {
    if (!mediaStreamRef.current) return;
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${wsProtocol}//${currentHost}:${currentPort}/live/publish`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'start',
          title: streamTitle || 'VfL Bochum 1848 — Live',
          uploader: currentUser?.display_name || currentUser?.username || 'Studio',
        }));

        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4';

        const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType, videoBitsPerSecond: 3000000 });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data?.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
        };
        recorder.start(1000);
        setIsStreaming(true);
        setStreamDuration(0);
        timerRef.current = setInterval(() => setStreamDuration(p => p + 1), 1000);
        onStreamStarted?.();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'viewers') setViewerCount(msg.count);
          else if (msg.type === 'chat') {
            setChatMessages(prev => [...prev, { id: 'c-' + Date.now(), user: msg.user, text: msg.text }]);
          }
        } catch {}
      };
      ws.onclose = () => stopLiveStream();
    } catch (err) {
      console.error(err);
      setCameraError('Die Verbindung zum Server kam nicht zustande.');
    }
  };

  const stopLiveStream = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
      wsRef.current.close();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsStreaming(false);
    onStreamEnded?.();
    onBack();
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    const user = currentUser?.display_name || currentUser?.username || 'Studio';
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat', user, text: chatText.trim() }));
    } else {
      setChatMessages(prev => [...prev, { id: 'c-' + Date.now(), user, text: chatText.trim() }]);
    }
    setChatText('');
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const copyValue = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div>
      <div style={{ paddingBlockEnd: 'var(--space-s)' }}>
        <button type="button" className="b-button b-button--secondary b-button--s" onClick={onBack}>
          <Icon name="arrow-left" size={16} />
          Zur Mediathek
        </button>
      </div>

      <section className="b-section">
        <SectionTitle title="Live-Studio">
          <Chips items={MODES} value={mode} onChange={setMode} scroll={false} />
        </SectionTitle>

        {mode === 'phone' ? (
          <div className="b-watch">
            <div className="b-stage" style={{ position: 'relative', aspectRatio: '16 / 9' }}>
              <video
                ref={videoPreviewRef}
                autoPlay muted playsInline
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {!cameraActive && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(4,24,37,.92)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 'var(--space-2xs)', padding: 'var(--space-s)', textAlign: 'center',
                }}>
                  <h3 className="b-heading b-heading--500">Kamera freigeben</h3>
                  <p className="b-copy">Der Browser fragt gleich nach Kamera und Mikrofon.</p>
                  {cameraError
                    ? <div className="b-notice b-notice--error">{cameraError}</div>
                    : (
                      <button type="button" className="b-button b-button--primary b-button--s"
                        onClick={() => requestCameraAccess()}>
                        Kamera starten
                      </button>
                    )}
                </div>
              )}

              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                padding: 'var(--space-2xs)', display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3xs)',
              }}>
                <span className="b-badge b-badge--static" style={{
                  background: isStreaming ? 'var(--color-live)' : 'var(--color-surface)',
                  color: isStreaming ? 'var(--color-white-400)' : 'var(--color-front)',
                }}>
                  {isStreaming ? `Live ${fmt(streamDuration)}` : 'Bereit'}
                </span>
                {isStreaming && (
                  <span className="b-badge b-badge--static" style={{ background: 'var(--color-surface)' }}>
                    {viewerCount} Zuschauer
                  </span>
                )}
              </div>

              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: 'var(--space-2xs)', display: 'flex', gap: 'var(--space-3xs)',
              }}>
                {!isStreaming ? (
                  <button type="button" className="b-button b-button--primary b-button--s"
                    style={{ flex: 1 }} onClick={startLiveStream} disabled={!cameraActive}>
                    Live gehen
                  </button>
                ) : (
                  <button type="button" className="b-button b-button--danger b-button--s"
                    style={{ flex: 1 }} onClick={stopLiveStream}>
                    Stream beenden
                  </button>
                )}
                <button type="button" className="b-button b-button--ghost b-button--s" onClick={toggleCamera}>
                  Kamera wechseln
                </button>
                <button type="button" className="b-button b-button--ghost b-button--s" onClick={toggleMute}>
                  {isMuted ? 'Mikro an' : 'Mikro aus'}
                </button>
              </div>
            </div>

            <div className="b-chat">
              <div className="b-chat__header">
                <span className="b-kicker">Stream</span>
                <span className="b-meta-line__item">{chatMessages.length} Nachrichten</span>
              </div>

              <div style={{ padding: 'var(--space-2xs) var(--space-xs)' }}>
                <div className="b-field">
                  <label className="b-label" htmlFor="stream-title">Titel</label>
                  <input id="stream-title" className="b-input" type="text" value={streamTitle}
                    onChange={e => setStreamTitle(e.target.value)}
                    placeholder="Testspiel gegen Swansea City" />
                </div>
              </div>

              <div className="b-chat__messages">
                {chatMessages.length === 0 ? (
                  <p className="b-copy">Nachrichten aus dem Chat erscheinen hier, sobald du live bist.</p>
                ) : chatMessages.map(c => (
                  <p key={c.id} className="b-chat__message">
                    <span className="b-chat__author">{c.user}</span>
                    <span>{c.text}</span>
                  </p>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form className="b-chat__form" onSubmit={handleSendChat}>
                <div style={{ display: 'flex', gap: 'var(--space-3xs)' }}>
                  <input className="b-input" type="text" value={chatText}
                    onChange={e => setChatText(e.target.value)}
                    placeholder="Nachricht an den Chat" aria-label="Nachricht an den Chat" />
                  <button type="submit" className="b-button b-button--primary b-button--s">Senden</button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="b-panel b-panel--l" style={{ maxWidth: 'var(--max-width-m)' }}>
            <h3 className="b-heading b-heading--500">Von OBS senden</h3>
            <p className="b-copy" style={{ marginBlock: 'var(--space-2xs) var(--space-s)' }}>
              Trag diese beiden Werte in OBS unter Einstellungen → Stream ein und wähle als Dienst
              „Benutzerdefiniert". Sobald du dort sendest, erscheint der Stream auf der Startseite.
            </p>

            {[
              { key: 'url', label: 'Server', value: rtmpServerUrl },
              { key: 'key', label: 'Stream Key', value: streamKey },
            ].map(field => (
              <div className="b-field" key={field.key} style={{ marginBottom: 'var(--space-s)' }}>
                <span className="b-label">{field.label}</span>
                <div style={{ display: 'flex', gap: 'var(--space-3xs)' }}>
                  <input className="b-input b-input--mono" readOnly value={field.value}
                    placeholder={field.key === 'key' ? 'Kein Key vorhanden — in den Einstellungen erzeugen' : ''} />
                  <button type="button" className="b-button b-button--secondary b-button--s"
                    onClick={() => copyValue(field.value, field.key)} disabled={!field.value}>
                    {copied === field.key ? 'Kopiert' : 'Kopieren'}
                  </button>
                </div>
              </div>
            ))}

            {!streamKey && (
              <div className="b-notice b-notice--info">
                Für diesen Account liegt noch kein Stream Key vor. Leg ihn unter Einstellungen → Stream an.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
