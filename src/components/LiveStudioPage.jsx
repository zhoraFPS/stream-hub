import React, { useState, useRef, useEffect } from 'react';
import { Radio, Camera, Mic, MicOff, RefreshCw, Square, ArrowLeft, Send, Copy, CheckCircle2, Monitor, Smartphone, MessageSquare, Users } from 'lucide-react';

export default function LiveStudioPage({ onBack, onStreamStarted, onStreamEnded }) {
  const [activeTab, setActiveTab] = useState('phone');
  const [streamTitle, setStreamTitle] = useState('Live Stream');
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [isMuted, setIsMuted] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [cameraError, setCameraError] = useState(null);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedServer, setCopiedServer] = useState(false);

  const videoPreviewRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const chatEndRef = useRef(null);

  const currentHost = window.location.hostname || 'localhost';
  const currentPort = window.location.port || '5000';
  const rtmpServerUrl = `rtmp://${currentHost}:1935/live`;
  const streamKey = `streamhub_live_${currentHost.replace(/\./g, '_')}`;

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const requestCameraAccess = async (targetFacingMode = facingMode) => {
    setCameraError(null);
    try {
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Kamera-Zugriff erfordert HTTPS. Nutze den OBS-Modus oder öffne die Seite über HTTPS.');
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: targetFacingMode }, audio: true });
      } catch (e) {
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
      setCameraError(err.message || 'Kamera-Zugriff verweigert.');
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
        ws.send(JSON.stringify({ type: 'start', title: streamTitle || 'Live Stream', uploader: 'Studio' }));
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
        if (onStreamStarted) onStreamStarted();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'viewers') setViewerCount(msg.count);
          else if (msg.type === 'chat') setChatMessages(prev => [...prev, { id: 'c-' + Date.now(), user: msg.user, text: msg.text }]);
        } catch (e) {}
      };
      ws.onclose = () => stopLiveStream();
    } catch (err) { console.error(err); }
  };

  const stopLiveStream = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
      wsRef.current.close();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsStreaming(false);
    if (onStreamEnded) onStreamEnded();
    onBack();
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    const msg = { type: 'chat', user: 'Streamer', text: chatText.trim() };
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg));
    else setChatMessages(prev => [...prev, { id: 'c-' + Date.now(), user: 'Ich', text: chatText.trim() }]);
    setChatText('');
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const copyToClipboard = (text, setter) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={onBack} className="btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Zurück
        </button>

        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          {[{ key: 'phone', icon: Smartphone, label: 'Kamera' }, { key: 'obs', icon: Monitor, label: 'OBS' }].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '6px 14px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
                background: activeTab === tab.key ? '#0055b8' : 'transparent',
                color: activeTab === tab.key ? '#fff' : '#94a3b8',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              <tab.icon style={{ width: 13, height: 13 }} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'phone' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="studio-grid">
          {/* Camera Preview */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            <video ref={videoPreviewRef} autoPlay muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

            {!cameraActive && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
                <Camera style={{ width: 36, height: 36, color: '#0055b8' }} />
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Kamera aktivieren</h3>
                <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', maxWidth: 280 }}>
                  Tippe auf den Button um Kamera und Mikrofon freizugeben.
                </p>
                {cameraError ? (
                  <div style={{ padding: '8px 14px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                    {cameraError}
                  </div>
                ) : (
                  <button onClick={() => requestCameraAccess()} className="btn-primary" style={{ fontSize: 12 }}>
                    <Camera style={{ width: 14, height: 14 }} /> Kamera freigeben
                  </button>
                )}
              </div>
            )}

            {/* Top Status Bar */}
            <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                {isStreaming && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }}></span>}
                <span>{isStreaming ? 'LIVE' : 'BEREIT'}</span>
                {isStreaming && <span style={{ color: '#94a3b8' }}>{fmt(streamDuration)}</span>}
              </div>
              {isStreaming && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Users style={{ width: 12, height: 12 }} /> {viewerCount}
                </div>
              )}
            </div>

            {/* Chat Overlay */}
            {isStreaming && chatMessages.length > 0 && (
              <div style={{ position: 'absolute', bottom: 64, left: 12, right: 12, zIndex: 10, maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {chatMessages.slice(-8).map(c => (
                  <div key={c.id} style={{ display: 'inline-block', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', padding: '3px 8px', borderRadius: 4, fontSize: 11, color: '#fff', maxWidth: '90%' }}>
                    <span style={{ fontWeight: 700, color: '#60a5fa', marginRight: 4 }}>{c.user}:</span>
                    <span>{c.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Bottom Controls */}
            <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, zIndex: 10, display: 'flex', gap: 8 }}>
              {!isStreaming ? (
                <button onClick={startLiveStream} disabled={!cameraActive} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '10px 0', fontSize: 12, opacity: cameraActive ? 1 : 0.4 }}>
                  <Radio style={{ width: 14, height: 14 }} /> Live starten
                </button>
              ) : (
                <button onClick={stopLiveStream} style={{ flex: 1, padding: '10px 0', borderRadius: 6, background: '#dc2626', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Square style={{ width: 14, height: 14, fill: '#fff' }} /> Beenden
                </button>
              )}
              <button onClick={toggleCamera} style={{ padding: 10, borderRadius: 6, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer' }}>
                <RefreshCw style={{ width: 14, height: 14, color: '#60a5fa' }} />
              </button>
              <button onClick={toggleMute} style={{ padding: 10, borderRadius: 6, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer' }}>
                {isMuted ? <MicOff style={{ width: 14, height: 14, color: '#ef4444' }} /> : <Mic style={{ width: 14, height: 14, color: '#34d399' }} />}
              </button>
            </div>
          </div>

          {/* Chat & Settings Panel */}
          <div className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff', fontFamily: 'var(--font-mono)' }}>
              <MessageSquare style={{ width: 14, height: 14, color: '#0055b8' }} /> Stream Einstellungen
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Titel</label>
              <input type="text" value={streamTitle} onChange={e => setStreamTitle(e.target.value)} placeholder="Stream Titel..."
                style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: '#fff', outline: 'none' }}
              />
            </div>

            <form onSubmit={handleSendChat} style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, display: 'flex', gap: 6 }}>
              <input type="text" value={chatText} onChange={e => setChatText(e.target.value)} placeholder="Chat Nachricht..."
                style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: '#fff', outline: 'none' }}
              />
              <button type="submit" className="btn-primary" style={{ fontSize: 12, padding: '7px 12px' }}>
                <Send style={{ width: 13, height: 13 }} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* OBS Tab */
        <div className="glass-panel" style={{ padding: 24, maxWidth: 560, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(0,85,184,0.15)', border: '1px solid rgba(0,85,184,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0055b8' }}>
              <Monitor style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OBS Studio</h2>
              <p style={{ fontSize: 11, color: '#64748b' }}>Streame direkt von deinem PC</p>
            </div>
          </div>

          {[{ label: 'Server URL (RTMP)', value: rtmpServerUrl, copied: copiedServer, setCopied: setCopiedServer },
            { label: 'Stream Key', value: streamKey, copied: copiedKey, setCopied: setCopiedKey }
          ].map(field => (
            <div key={field.label} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>{field.label}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" readOnly value={field.value}
                  style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '7px 10px', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#60a5fa', outline: 'none' }}
                />
                <button onClick={() => copyToClipboard(field.value, field.setCopied)} className="btn-secondary" style={{ fontSize: 11, padding: '7px 10px' }}>
                  {field.copied ? <CheckCircle2 style={{ width: 14, height: 14, color: '#34d399' }} /> : <Copy style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
