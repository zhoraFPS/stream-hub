import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';

// ─── HLS Player for OBS Streams ──────────────────────────────────────────────
function HLSPlayer({ hlsUrl, isMuted, setIsMuted, isPlaying, setIsPlaying }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [latency, setLatency] = useState(null);
  const hideTimer = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    setIsBuffering(true);

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        liveSyncDuration: 1.0,
        liveMaxLatencyDuration: 3.0,
        liveMinLatencyDuration: 0.5,
        latencyController: true,
        enableWorker: true,
        backBufferLength: 4,
        maxBufferLength: 4,
        maxMaxBufferLength: 8,
        maxBufferHole: 0.3,
        progressive: false,
        startFragPrefetch: true,
        testBandwidth: false,
        manifestLoadingMaxRetry: 10,
        levelLoadingMaxRetry: 10,
        fragLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 500,
        fragLoadingRetryDelay: 500,
      });
      hlsRef.current = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = true;
        video.play().then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }).catch(() => setIsBuffering(false));
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      const lagTimer = setInterval(() => {
        const v = videoRef.current;
        if (!v || v.paused) return;
        if (hls.latency > 5) {
          hls.currentLevel = -1;
          if (v.buffered.length > 0) {
            v.currentTime = v.buffered.end(v.buffered.length - 1) - 0.3;
          }
        }
        if (hls.latency != null) setLatency(Math.round(hls.latency * 10) / 10);
      }, 2000);

      return () => {
        clearInterval(lagTimer);
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.muted = true;
      video.play().then(() => { setIsPlaying(true); setIsBuffering(false); }).catch(() => setIsBuffering(false));
    }
  }, [hlsUrl]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handlePlay = () => {
    if (videoRef.current?.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => { clearTimeout(hideTimer.current); setShowControls(false); }}
      onMouseEnter={showControlsTemporarily}
      style={{ position: 'relative', background: '#000', overflow: 'hidden', aspectRatio: isFullscreen ? 'unset' : '16/9', height: isFullscreen ? '100vh' : undefined, cursor: showControls ? 'default' : 'none' }}
    >
      <video
        ref={videoRef}
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
      />

      {/* Buffering Spinner */}
      {isBuffering && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', gap: 12 }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.2)', borderTop: '3px solid #0055b8', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>STREAM WIRD GELADEN…</span>
        </div>
      )}

      {/* Gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 40%, transparent 70%, rgba(0,0,0,0.5) 100%)', pointerEvents: 'none', opacity: showControls ? 1 : 0, transition: 'opacity 0.3s ease' }} />

      {/* Top Bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: showControls ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: showControls ? 'auto' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="live-badge">
            LIVE
          </div>
          {latency && (
            <div style={{ background: '#000', padding: '4px 8px', fontSize: 10, color: '#94a3b8', fontWeight: 900, letterSpacing: '0.06em' }}>
              LATENZ {latency}S
            </div>
          )}
        </div>
      </div>

      {/* Center Play/Pause on click */}
      <div onClick={handlePlay} style={{ position: 'absolute', inset: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!isPlaying && !isBuffering && (
          <div style={{ background: '#0055b8', padding: '14px 28px', color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: '0.08em' }}>
            STREAM ABSPIELEN
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, opacity: showControls ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: showControls ? 'auto' : 'none' }}>
        
        <button onClick={handlePlay} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.06em' }}>
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setIsMuted(!isMuted)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.06em' }}>
            {isMuted || volume === 0 ? 'TON AN' : 'TON AUS'}
          </button>
          <input
            type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
            onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(parseFloat(e.target.value) === 0); }}
            style={{ width: 80, height: 3, accentColor: '#0055b8', cursor: 'pointer' }}
          />
        </div>

        <button
          onClick={() => { if (hlsRef.current) hlsRef.current.currentLevel = hlsRef.current.levels.length - 1; if (videoRef.current) { const buf = videoRef.current.buffered; if (buf.length) videoRef.current.currentTime = buf.end(buf.length - 1) - 0.5; } }}
          style={{ marginLeft: 'auto', background: '#dc2626', border: 'none', cursor: 'pointer', padding: '5px 12px', fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          ZUM LIVE-EDGE
        </button>

        <button onClick={toggleFullscreen} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.06em' }}>
          {isFullscreen ? 'VOLLBILD BEENDEN' : 'VOLLBILD'}
        </button>
      </div>
    </div>
  );
}

// ─── Main LivePlayer Component ────────────────────────────────────────────────
export default function LivePlayer({ liveStreamInfo, onBack }) {
  const videoRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const bufferQueueRef = useRef([]);
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);

  const [viewerCount, setViewerCount] = useState(liveStreamInfo?.viewers || 1);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [comments, setComments] = useState([
    { id: 'sys-1', user: 'SYSTEM', text: 'STREAM GESTARTET — WILLKOMMEN!', isSystem: true }
  ]);
  const [commentText, setCommentText] = useState('');
  const [commentUser, setCommentUser] = useState('');

  const streamKey = liveStreamInfo?.stream_key || liveStreamInfo?.streamKey || 'streamhub_live';
  const isObs = liveStreamInfo?.isLive !== false && (
    liveStreamInfo?.id === 'live-obs' ||
    (typeof liveStreamInfo?.id === 'string' && liveStreamInfo.id.startsWith('live-obs')) ||
    !!liveStreamInfo?.stream_key ||
    !!liveStreamInfo?.streamKey
  );
  const host = window.location.hostname || 'localhost';
  const hlsUrl = liveStreamInfo?.hlsUrl || `http://${host}:8888/live/${streamKey}/index.m3u8`;

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
    if (isObs) return;

    const hasMediaSource = typeof window !== 'undefined' && 'MediaSource' in window;
    if (hasMediaSource) {
      try {
        const ms = new window.MediaSource();
        mediaSourceRef.current = ms;
        if (videoRef.current) videoRef.current.src = URL.createObjectURL(ms);
        ms.addEventListener('sourceopen', () => {
          try {
            let mime = 'video/webm;codecs=vp8,opus';
            if (!window.MediaSource.isTypeSupported(mime)) mime = 'video/webm';
            if (!window.MediaSource.isTypeSupported(mime)) mime = 'video/mp4';
            const sb = ms.addSourceBuffer(mime);
            sourceBufferRef.current = sb;
            sb.mode = 'sequence';
            sb.addEventListener('updateend', () => { processQueue(); jumpToLiveEdgeIfNeeded(); });
          } catch (e) { console.error('MediaSource buffer init:', e); }
        });
      } catch (e) { console.error('MediaSource creation error:', e); }
    }
  }, [isObs]);

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsPort = window.location.port || '5000';
    const ws = new WebSocket(`${wsProtocol}//${host}:${wsPort}/live/watch`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'viewers') setViewerCount(msg.count);
          else if (msg.type === 'chat') {
            setComments(prev => [...prev, { id: 'c-' + Date.now(), user: msg.user, text: msg.text }]);
          }
        } catch (e) {}
      } else if (!isObs && event.data instanceof Blob) {
        event.data.arrayBuffer().then(buf => { bufferQueueRef.current.push(buf); processQueue(); });
      }
    };

    return () => ws.close();
  }, [liveStreamInfo]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const user = commentUser.trim() || 'ZUSCHAUER';
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat', user, text: commentText.trim() }));
    } else {
      setComments(prev => [...prev, { id: 'c-' + Date.now(), user, text: commentText.trim() }]);
    }
    setCommentText('');
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {onBack && (
          <button onClick={onBack} className="btn-secondary" style={{ fontSize: 11, flexShrink: 0 }}>
            ← ZURÜCK
          </button>
        )}
        <h1 style={{ fontSize: 16, fontWeight: 900, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {liveStreamInfo?.title || 'Live Stream'}
        </h1>
        <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: '#94a3b8', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {viewerCount} ZUSCHAUER
        </div>
      </div>

      {/* Main Layout: Player + Chat */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }} className="live-layout-grid">

        {/* Left: Video + Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          
          {isObs ? (
            <HLSPlayer
              hlsUrl={hlsUrl}
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
            />
          ) : (
            <div style={{ position: 'relative', background: '#000', overflow: 'hidden', aspectRatio: '16/9' }}>
              <video ref={videoRef} autoPlay playsInline muted={isMuted} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onPlaying={() => setIsPlaying(true)} />
              {!isPlaying && (
                <button onClick={() => videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => {})}
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: '#0055b8', padding: '14px 28px', color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: '0.08em' }}>
                    STREAM ABSPIELEN
                  </div>
                </button>
              )}
              <div className="live-badge" style={{ position: 'absolute', top: 16, left: 16 }}>
                LIVE
              </div>
              <button onClick={() => setIsMuted(!isMuted)} style={{ position: 'absolute', bottom: 16, right: 16, padding: '6px 12px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 900 }}>
                {isMuted ? 'TON AN' : 'TON AUS'}
              </button>
            </div>
          )}

          {/* Stream Info Bar */}
          <div style={{ padding: '16px 20px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, background: '#0055b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900, fontSize: 14, color: '#fff' }}>
              LIVE
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {liveStreamInfo?.title || 'Live Stream'}
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {liveStreamInfo?.uploader || 'Streamer'} · JETZT LIVE
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: '#94a3b8', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              LIVE · {viewerCount} SCHAUEN ZU
            </div>
          </div>
        </div>

        {/* Right: Chat Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', overflow: 'hidden', height: 'calc(100% + 64px)', minHeight: 480, maxHeight: 640 }} className="live-chat-panel">
          
          {/* Chat Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>LIVE CHAT</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>{comments.length} NACHRICHTEN</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {comments.map(c => (
              <div key={c.id} style={{ padding: '8px 12px', background: c.isSystem ? 'rgba(0,85,184,0.15)' : 'rgba(255,255,255,0.04)', fontSize: 12, lineHeight: 1.4 }}>
                {c.isSystem ? (
                  <span style={{ color: '#60a5fa', fontSize: 11, fontWeight: 900, letterSpacing: '0.04em' }}>{c.text}</span>
                ) : (
                  <>
                    <span style={{ fontWeight: 900, color: '#0055b8', marginRight: 8, textTransform: 'uppercase' }}>{c.user}</span>
                    <span style={{ color: '#ffffff' }}>{c.text}</span>
                  </>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              placeholder="DEIN NAME (OPTIONAL)"
              value={commentUser}
              onChange={e => setCommentUser(e.target.value)}
              className="input-search"
              style={{ width: '100%', padding: '8px 12px', fontSize: 11, textTransform: 'uppercase' }}
            />
            <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="NACHRICHT SENDEN…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                className="input-search"
                style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
              />
              <button type="submit" className="btn-primary" style={{ fontSize: 11, padding: '8px 16px', flexShrink: 0 }}>
                SENDEN
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
