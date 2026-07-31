import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Radio, Users, Volume2, VolumeX, ArrowLeft, MessageSquare,
  Send, Play, Pause, Maximize, Minimize, Settings, Wifi
} from 'lucide-react';

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

  // Setup HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    setIsBuffering(true);

    if (Hls.isSupported()) {
      const hls = new Hls({
        // ── Low-Latency HLS Settings ──────────────────
        lowLatencyMode: true,          // LL-HLS aktivieren
        liveSyncDuration: 1.0,         // Ziel: 1s hinter live edge
        liveMaxLatencyDuration: 3.0,   // Ab 3s → automatisch zurückspringen
        liveMinLatencyDuration: 0.5,   // Minimum buffer
        latencyController: true,       // Automatische Latenz-Kontrolle

        // ── Buffer & Performance ──────────────────────
        enableWorker: true,            // Background-Thread für Demuxing
        backBufferLength: 4,           // Nur 4s Rückpuffer (spart RAM)
        maxBufferLength: 4,            // Max 4s vorausladen
        maxMaxBufferLength: 8,         // Absolutes Maximum
        maxBufferHole: 0.3,            // Kleine Lücken überbrücken

        // ── Segment Fetching ──────────────────────────
        progressive: false,
        startFragPrefetch: true,       // Nächstes Segment vorladen
        testBandwidth: false,          // Kein ABR nötig (single quality)

        // ── Retry & Recovery ─────────────────────────
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

      // ── Auto-Recovery on Fatal Error ──────────────
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HLS] Network error, retrying...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS] Media error, recovering...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[HLS] Fatal error, reloading:', data);
              hls.destroy();
              break;
          }
        }
      });

      // ── Lag Detection: Jump to Live Edge if too far behind ──
      const lagTimer = setInterval(() => {
        const v = videoRef.current;
        if (!v || v.paused) return;
        if (hls.latency > 5) {
          console.warn(`[HLS] Lag detected (${hls.latency.toFixed(1)}s), jumping to live edge`);
          hls.currentLevel = -1; // Auto-Quality
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
      // Native HLS (Safari)
      video.src = hlsUrl;
      video.muted = true;
      video.play().then(() => { setIsPlaying(true); setIsBuffering(false); }).catch(() => setIsBuffering(false));
    }
  }, [hlsUrl]);

  // Sync muted state
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  // Sync volume
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  // Auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Fullscreen
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
      style={{ position: 'relative', background: '#000', borderRadius: isFullscreen ? 0 : 12, overflow: 'hidden', aspectRatio: isFullscreen ? 'unset' : '16/9', height: isFullscreen ? '100vh' : undefined, cursor: showControls ? 'default' : 'none' }}
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
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', gap: 12 }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.15)', borderTop: '3px solid #0055b8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>Stream wird geladen…</span>
        </div>
      )}

      {/* Gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 40%, transparent 70%, rgba(0,0,0,0.5) 100%)', pointerEvents: 'none', opacity: showControls ? 1 : 0, transition: 'opacity 0.3s ease' }} />

      {/* Top Bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: showControls ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: showControls ? 'auto' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#dc2626', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: '#fff' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
            LIVE
          </div>
          {latency && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: 4, fontSize: 10, color: '#94a3b8' }}>
              <Wifi style={{ width: 10, height: 10 }} />
              {latency}s
            </div>
          )}
        </div>
      </div>

      {/* Center Play/Pause on click */}
      <div onClick={handlePlay} style={{ position: 'absolute', inset: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!isPlaying && !isBuffering && (
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,85,184,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px rgba(0,85,184,0.5)', backdropFilter: 'blur(4px)' }}>
            <Play style={{ width: 28, height: 28, color: '#fff', fill: '#fff', marginLeft: 4 }} />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: showControls ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: showControls ? 'auto' : 'none' }}>
        
        {/* Play/Pause */}
        <button onClick={handlePlay} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#fff', display: 'flex' }}>
          {isPlaying ? <Pause style={{ width: 20, height: 20 }} /> : <Play style={{ width: 20, height: 20, fill: '#fff' }} />}
        </button>

        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setIsMuted(!isMuted)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#fff', display: 'flex' }}>
            {isMuted || volume === 0 ? <VolumeX style={{ width: 18, height: 18 }} /> : <Volume2 style={{ width: 18, height: 18 }} />}
          </button>
          <input
            type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
            onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(parseFloat(e.target.value) === 0); }}
            style={{ width: 80, height: 3, accentColor: '#0055b8', cursor: 'pointer' }}
          />
        </div>

        {/* Live indicator / skip to live */}
        <button
          onClick={() => { if (hlsRef.current) hlsRef.current.currentLevel = hlsRef.current.levels.length - 1; if (videoRef.current) { const buf = videoRef.current.buffered; if (buf.length) videoRef.current.currentTime = buf.end(buf.length - 1) - 0.5; } }}
          style={{ marginLeft: 'auto', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: 4, cursor: 'pointer', padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
          ZUM LIVE-EDGE
        </button>

        {/* Fullscreen */}
        <button onClick={toggleFullscreen} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#fff', display: 'flex' }}>
          {isFullscreen ? <Minimize style={{ width: 18, height: 18 }} /> : <Maximize style={{ width: 18, height: 18 }} />}
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
    { id: 'sys-1', user: 'System', text: '🎬 Stream gestartet — Willkommen!', isSystem: true }
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

  // Phone stream WebSocket setup
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

  // WebSocket for chat + viewer count (both stream types)
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
    const user = commentUser.trim() || 'Zuschauer';
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat', user, text: commentText.trim() }));
    } else {
      setComments(prev => [...prev, { id: 'c-' + Date.now(), user, text: commentText.trim() }]);
    }
    setCommentText('');
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} className="btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Zurück
        </button>
        <h1 style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {liveStreamInfo?.title || 'Live Stream'}
        </h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>
          <Users style={{ width: 14, height: 14 }} />
          {viewerCount} Zuschauer
        </div>
      </div>

      {/* Main Layout: Player + Chat (Twitch-style) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }} className="live-layout-grid">

        {/* Left: Video + Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          
          {/* HLS Player (OBS) or Phone Player */}
          {isObs ? (
            <HLSPlayer
              hlsUrl={hlsUrl}
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
            />
          ) : (
            /* Phone Camera Player */
            <div style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9' }}>
              <video ref={videoRef} autoPlay playsInline muted={isMuted} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onPlaying={() => setIsPlaying(true)} />
              {!isPlaying && (
                <button onClick={() => videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => {})}
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#0055b8', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px rgba(0,85,184,0.5)' }}>
                    <Play style={{ width: 28, height: 28, color: '#fff', fill: '#fff', marginLeft: 4 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stream abspielen</span>
                </button>
              )}
              {/* Live Badge */}
              <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(220,38,38,0.9)', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 800, color: '#fff' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
                LIVE
              </div>
              {/* Volume */}
              <button onClick={() => setIsMuted(!isMuted)} style={{ position: 'absolute', bottom: 12, right: 12, padding: 8, borderRadius: 6, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer' }}>
                {isMuted ? <VolumeX style={{ width: 16, height: 16 }} /> : <Volume2 style={{ width: 16, height: 16 }} />}
              </button>
            </div>
          )}

          {/* Stream Info Bar */}
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #0055b8, #0068e0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Radio style={{ width: 18, height: 18, color: '#fff' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {liveStreamInfo?.title || 'Live Stream'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                {liveStreamInfo?.uploader || 'Streamer'} · Jetzt live
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              Live · {viewerCount} schauen zu
            </div>
          </div>
        </div>

        {/* Right: Chat Panel (Twitch-style) */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', height: 'calc(100% + 52px)', minHeight: 480, maxHeight: 640 }} className="live-chat-panel">
          
          {/* Chat Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare style={{ width: 15, height: 15, color: '#0055b8' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Live Chat</span>
            <div style={{ marginLeft: 'auto', fontSize: 10, color: '#475569' }}>{comments.length} Nachrichten</div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {comments.map(c => (
              <div key={c.id} style={{ padding: '5px 8px', borderRadius: 6, background: c.isSystem ? 'rgba(0,85,184,0.08)' : 'rgba(255,255,255,0.03)', fontSize: 13, lineHeight: 1.4 }}>
                {c.isSystem ? (
                  <span style={{ color: '#60a5fa', fontSize: 12 }}>{c.text}</span>
                ) : (
                  <>
                    <span style={{ fontWeight: 700, color: '#60a5fa', marginRight: 6 }}>{c.user}</span>
                    <span style={{ color: '#e2e8f0' }}>{c.text}</span>
                  </>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="text"
              placeholder="Dein Name (optional)"
              value={commentUser}
              onChange={e => setCommentUser(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: '#f8fafc', outline: 'none', boxSizing: 'border-box' }}
            />
            <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="Nachricht senden…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: '#f8fafc', outline: 'none' }}
              />
              <button type="submit" className="btn-primary" style={{ fontSize: 12, padding: '7px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Send style={{ width: 13, height: 13 }} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
