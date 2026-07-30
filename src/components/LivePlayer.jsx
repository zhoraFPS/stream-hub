import React, { useRef, useState, useEffect } from 'react';
import { Radio, Users, Volume2, VolumeX, ArrowLeft, MessageSquare, Send, Play } from 'lucide-react';

export default function LivePlayer({ liveStreamInfo, onBack }) {
  const videoRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const bufferQueueRef = useRef([]);
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);

  const [viewerCount, setViewerCount] = useState(liveStreamInfo?.viewers || 0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentUser, setCommentUser] = useState('');

  const jumpToLiveEdgeIfNeeded = () => {
    if (videoRef.current?.buffered?.length > 0) {
      const end = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      if (end - videoRef.current.currentTime > 3.5) {
        videoRef.current.currentTime = Math.max(0, end - 1.5);
      }
    }
  };

  const processQueue = () => {
    const sb = sourceBufferRef.current;
    if (sb && !sb.updating && bufferQueueRef.current.length > 0) {
      try {
        sb.appendBuffer(bufferQueueRef.current.shift());
        if (videoRef.current?.paused) videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      } catch (err) { console.warn('Buffer error:', err); }
    }
  };

  useEffect(() => {
    const ms = new MediaSource();
    mediaSourceRef.current = ms;
    if (videoRef.current) videoRef.current.src = URL.createObjectURL(ms);

    ms.addEventListener('sourceopen', () => {
      try {
        let mime = 'video/webm;codecs=vp8,opus';
        if (!MediaSource.isTypeSupported(mime)) mime = 'video/webm';
        if (!MediaSource.isTypeSupported(mime)) mime = 'video/mp4';
        const sb = ms.addSourceBuffer(mime);
        sourceBufferRef.current = sb;
        sb.mode = 'sequence';
        sb.addEventListener('updateend', () => { processQueue(); jumpToLiveEdgeIfNeeded(); });
      } catch (e) { console.error('MediaSource:', e); }
    });

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.hostname || 'localhost'}:${window.location.port || '5000'}/live/watch`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'viewers') setViewerCount(msg.count);
          else if (msg.type === 'chat') setComments(prev => [...prev, { id: 'c-' + Date.now(), user: msg.user, text: msg.text }]);
        } catch (e) {}
      } else if (event.data instanceof Blob) {
        event.data.arrayBuffer().then(buf => { bufferQueueRef.current.push(buf); processQueue(); });
      }
    };

    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handlePlay = () => {
    if (videoRef.current) videoRef.current.play().then(() => { setIsPlaying(true); jumpToLiveEdgeIfNeeded(); }).catch(() => {});
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const user = commentUser.trim() || 'Zuschauer';
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: 'chat', user, text: commentText.trim() }));
    else setComments(prev => [...prev, { id: 'c-' + Date.now(), user, text: commentText.trim() }]);
    setCommentText('');
  };

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} className="btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Zurück
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 4, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse 2s infinite' }}></span>
          LIVE
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="live-grid">

        {/* Video Player */}
        <div style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', border: '1px solid rgba(255,255,255,0.08)' }}>
          <video ref={videoRef} autoPlay playsInline muted={isMuted} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />

          {!isPlaying && (
            <button onClick={handlePlay} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 20, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0055b8', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(0,85,184,0.4)' }}>
                <Play style={{ width: 24, height: 24, color: '#fff', fill: '#fff', marginLeft: 3 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stream abspielen</span>
            </button>
          )}

          {/* Live Badge */}
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }}></span>
            LIVE
            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users style={{ width: 12, height: 12 }} /> {viewerCount}
            </span>
          </div>

          {/* Volume */}
          <button onClick={() => setIsMuted(!isMuted)} style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 10, padding: 8, borderRadius: 6, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer' }}>
            {isMuted ? <VolumeX style={{ width: 16, height: 16, color: '#ef4444' }} /> : <Volume2 style={{ width: 16, height: 16, color: '#34d399' }} />}
          </button>
        </div>

        {/* Stream Info */}
        <div className="glass-panel" style={{ padding: 16 }}>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            {liveStreamInfo?.title || 'Live Stream'}
          </h1>
          <p style={{ fontSize: 12, color: '#64748b' }}>
            {liveStreamInfo?.uploader || 'Streamer'} &middot; Echtzeit-Übertragung
          </p>
        </div>

        {/* Live Chat */}
        <div className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', height: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10, marginBottom: 10, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff', fontFamily: 'var(--font-mono)' }}>
            <MessageSquare style={{ width: 14, height: 14, color: '#0055b8' }} /> Live Chat
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
            {comments.length === 0 && (
              <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', marginTop: 24 }}>Noch keine Nachrichten</p>
            )}
            {comments.map(c => (
              <div key={c.id} style={{ padding: '4px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.03)', fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: '#60a5fa', marginRight: 4 }}>{c.user}:</span>
                <span style={{ color: '#e2e8f0' }}>{c.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleCommentSubmit} style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input type="text" placeholder="Dein Name..." value={commentUser} onChange={e => setCommentUser(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#fff', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" placeholder="Nachricht..." value={commentText} onChange={e => setCommentText(e.target.value)}
                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#fff', outline: 'none' }}
              />
              <button type="submit" className="btn-primary" style={{ fontSize: 11, padding: '6px 10px' }}>
                <Send style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
