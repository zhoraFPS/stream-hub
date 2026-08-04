import React, { useRef, useState, useEffect, useCallback } from 'react';
import Icon from './ui/Icon';

// hls.js wiegt minifiziert 530 kB und wird nur gebraucht, wenn tatsächlich ein
// Stream läuft. Deshalb erst beim Abspielen laden, nicht beim Seitenaufruf.

// ─── HLS-Player für OBS-Streams ──────────────────────────────────────────────
function HLSPlayer({ hlsUrl, isMuted, setIsMuted, isPlaying, setIsPlaying }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [latency, setLatency] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const hideTimer = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    let cancelled = false;
    let hls = null;
    let lagTimer = null;

    setIsBuffering(true);

    (async () => {
      const { default: Hls } = await import('hls.js');
      if (cancelled || !videoRef.current) return;

      if (!Hls.isSupported()) {
        // Safari spielt HLS nativ ab.
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = hlsUrl;
          video.muted = true;
          video.play()
            .then(() => { setIsPlaying(true); setIsBuffering(false); })
            .catch(() => setIsBuffering(false));
        } else {
          setIsBuffering(false);
          setLoadError('Dieser Browser kann den Live-Stream nicht abspielen.');
        }
        return;
      }

      hls = new Hls({
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
            case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
            case Hls.ErrorTypes.MEDIA_ERROR:   hls.recoverMediaError(); break;
            default: hls.destroy(); break;
          }
        }
      });

      lagTimer = setInterval(() => {
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
    })().catch(() => {
      if (!cancelled) {
        setIsBuffering(false);
        setLoadError('Der Player konnte nicht geladen werden. Lade die Seite neu.');
      }
    });

    return () => {
      cancelled = true;
      if (lagTimer) clearInterval(lagTimer);
      if (hls) { try { hls.destroy(); } catch {} }
      hlsRef.current = null;
    };
  }, [hlsUrl]);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = isMuted; }, [isMuted]);
  useEffect(() => { if (videoRef.current) videoRef.current.volume = volume; }, [volume]);

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

  const jumpToEdge = () => {
    if (hlsRef.current) hlsRef.current.currentLevel = hlsRef.current.levels.length - 1;
    const v = videoRef.current;
    if (v?.buffered.length) v.currentTime = v.buffered.end(v.buffered.length - 1) - 0.5;
  };

  const overlay = { opacity: showControls ? 1 : 0, transition: 'opacity .3s ease' };

  return (
    <div
      ref={containerRef}
      onMouseMove={showControlsTemporarily}
      onMouseEnter={showControlsTemporarily}
      onMouseLeave={() => { clearTimeout(hideTimer.current); setShowControls(false); }}
      className="b-stage"
      style={{
        position: 'relative',
        aspectRatio: isFullscreen ? 'unset' : '16 / 9',
        height: isFullscreen ? '100vh' : undefined,
        cursor: showControls ? 'default' : 'none',
      }}
    >
      <video
        ref={videoRef}
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
      />

      {(isBuffering || loadError) && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2xs)',
          background: 'rgba(4, 24, 37, .7)', padding: 'var(--space-s)', textAlign: 'center',
        }}>
          {loadError ? (
            <div className="b-notice b-notice--error">{loadError}</div>
          ) : (
            <>
              <div className="b-spinner" />
              <span className="b-kicker">Stream wird geladen</span>
            </>
          )}
        </div>
      )}

      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(to top, rgba(4,24,37,.85) 0%, transparent 38%, transparent 72%, rgba(4,24,37,.6) 100%)',
        ...overlay,
      }} />

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: 'var(--space-2xs)', display: 'flex', gap: 'var(--space-3xs)',
        pointerEvents: 'none', ...overlay,
      }}>
        <span className="b-badge b-badge--live b-badge--static">Live</span>
        {latency != null && (
          <span className="b-badge b-badge--static" style={{ background: 'var(--color-surface)' }}>
            Latenz {latency}s
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handlePlay}
        aria-label={isPlaying ? 'Pause' : 'Abspielen'}
        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {!isPlaying && !isBuffering && (
          <span className="b-button b-button--primary">
            <Icon name="play" size={18} />
            Stream abspielen
          </span>
        )}
      </button>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 'var(--space-2xs)', display: 'flex', alignItems: 'center',
        gap: 'var(--space-2xs)', flexWrap: 'wrap',
        pointerEvents: showControls ? 'auto' : 'none', ...overlay,
      }}>
        <button type="button" className="b-button b-button--ghost b-button--s" onClick={handlePlay}>
          {isPlaying ? 'Pause' : 'Abspielen'}
        </button>

        <button type="button" className="b-button b-button--ghost b-button--s" onClick={() => setIsMuted(!isMuted)}>
          {isMuted || volume === 0 ? 'Ton an' : 'Ton aus'}
        </button>

        <input
          type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
          aria-label="Lautstärke"
          onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(parseFloat(e.target.value) === 0); }}
          style={{ width: 96, accentColor: 'var(--color-front)' }}
        />

        <button type="button" className="b-button b-button--danger b-button--s"
          style={{ marginLeft: 'auto' }} onClick={jumpToEdge}>
          Zum Live-Punkt
        </button>

        <button type="button" className="b-button b-button--ghost b-button--s" onClick={toggleFullscreen}>
          {isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
        </button>
      </div>
    </div>
  );
}

// ─── LivePlayer ───────────────────────────────────────────────────────────────
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
    { id: 'sys-1', user: 'System', text: 'Stream gestartet. Willkommen!', isSystem: true },
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
    const user = commentUser.trim() || 'Zuschauer';
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat', user, text: commentText.trim() }));
    } else {
      setComments(prev => [...prev, { id: 'c-' + Date.now(), user, text: commentText.trim() }]);
    }
    setCommentText('');
  };

  const title = liveStreamInfo?.title || 'Live';

  return (
    <div className="b-section">
      <div className="b-row" style={{ paddingBlockEnd: 'var(--space-s)' }}>
        {onBack && (
          <button type="button" className="b-button b-button--secondary b-button--s" onClick={onBack}>
            <Icon name="arrow-left" size={16} />
            Zurück
          </button>
        )}
        <span className="b-badge b-badge--live b-badge--static">Live</span>
        <span className="b-spacer" />
        <span className="b-meta-line__item">{viewerCount} schauen zu</span>
      </div>

      <div className="b-watch">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)', minWidth: 0 }}>
          {isObs ? (
            <HLSPlayer
              hlsUrl={hlsUrl}
              isMuted={isMuted} setIsMuted={setIsMuted}
              isPlaying={isPlaying} setIsPlaying={setIsPlaying}
            />
          ) : (
            <div className="b-stage" style={{ position: 'relative', aspectRatio: '16 / 9' }}>
              <video ref={videoRef} autoPlay playsInline muted={isMuted}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onPlaying={() => setIsPlaying(true)} />
              {!isPlaying && (
                <button
                  type="button"
                  onClick={() => videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => {})}
                  style={{
                    position: 'absolute', inset: 0, background: 'rgba(4,24,37,.75)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span className="b-button b-button--primary">
                    <Icon name="play" size={18} />
                    Stream abspielen
                  </span>
                </button>
              )}
              <span className="b-badge b-badge--live" style={{ top: 0, left: 0 }}>Live</span>
              <button type="button" className="b-button b-button--ghost b-button--s"
                style={{ position: 'absolute', bottom: 'var(--space-2xs)', right: 'var(--space-2xs)' }}
                onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? 'Ton an' : 'Ton aus'}
              </button>
            </div>
          )}

          <div>
            <h1 className="b-heading b-heading--500">{title}</h1>
            <div className="b-meta-line" style={{ marginTop: 'var(--space-3xs)' }}>
              <span className="b-meta-line__item">{liveStreamInfo?.uploader || 'VfL Redaktion'}</span>
              <span className="b-meta-line__item">Jetzt live</span>
              <span className="b-meta-line__item">{viewerCount} Zuschauer</span>
            </div>
          </div>
        </div>

        <div className="b-chat">
          <div className="b-chat__header">
            <span className="b-kicker">Chat</span>
            <span className="b-meta-line__item">{comments.length} Nachrichten</span>
          </div>

          <div className="b-chat__messages">
            {comments.map(c => (
              <p key={c.id} className="b-chat__message">
                {c.isSystem ? (
                  <span style={{ color: 'var(--color-alpha-500)' }}>{c.text}</span>
                ) : (
                  <>
                    <span className="b-chat__author">{c.user}</span>
                    <span>{c.text}</span>
                  </>
                )}
              </p>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form className="b-chat__form" onSubmit={handleCommentSubmit}>
            <input
              className="b-input"
              type="text"
              placeholder="Dein Name"
              value={commentUser}
              onChange={e => setCommentUser(e.target.value)}
              aria-label="Dein Name"
            />
            <div style={{ display: 'flex', gap: 'var(--space-3xs)' }}>
              <input
                className="b-input"
                type="text"
                placeholder="Nachricht schreiben"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                aria-label="Nachricht"
              />
              <button type="submit" className="b-button b-button--primary b-button--s">Senden</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
