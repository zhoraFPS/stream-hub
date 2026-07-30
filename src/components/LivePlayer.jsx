import React, { useRef, useState, useEffect } from 'react';
import { Radio, Users, Volume2, VolumeX, ArrowLeft, MessageSquare, Send, Play } from 'lucide-react';

export default function LivePlayer({ liveStreamInfo, onBack }) {
  const videoRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const bufferQueueRef = useRef([]);
  const wsRef = useRef(null);

  const [viewerCount, setViewerCount] = useState(liveStreamInfo?.viewers || 1);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [comments, setComments] = useState([
    { id: 'c1', user: 'Admin', text: '🔴 Live-Stream gestartet!', date: new Date().toISOString() }
  ]);
  const [commentText, setCommentText] = useState('');
  const [commentUser, setCommentUser] = useState('');

  // Auto seek to the live edge (<100ms latency)
  const jumpToLiveEdge = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const liveEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      // If playback is lagging behind by more than 0.4 seconds, jump straight to live edge!
      if (liveEnd - videoRef.current.currentTime > 0.4) {
        videoRef.current.currentTime = Math.max(0, liveEnd - 0.1);
      }
    }
  };

  // Process incoming buffer queue into SourceBuffer
  const processQueue = () => {
    const sb = sourceBufferRef.current;
    if (sb && !sb.updating && bufferQueueRef.current.length > 0) {
      try {
        const nextBuffer = bufferQueueRef.current.shift();
        sb.appendBuffer(nextBuffer);

        // Auto seek to live edge and start playback
        jumpToLiveEdge();
        if (videoRef.current && videoRef.current.paused) {
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      } catch (err) {
        console.warn('SourceBuffer append error:', err);
      }
    }
  };

  useEffect(() => {
    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;

    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(mediaSource);
    }

    mediaSource.addEventListener('sourceopen', () => {
      try {
        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaSource.isTypeSupported(mimeType)) mimeType = 'video/webm';
        if (!MediaSource.isTypeSupported(mimeType)) mimeType = 'video/mp4';

        const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
        sourceBufferRef.current = sourceBuffer;
        sourceBuffer.mode = 'sequence';

        sourceBuffer.addEventListener('updateend', () => {
          processQueue();
          jumpToLiveEdge();
        });
      } catch (err) {
        console.error('MediaSource error:', err);
      }
    });

    // Connect WebSocket Live Viewer
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname || 'localhost';
    const wsPort = window.location.port || '5000';
    const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/live/watch`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'viewers') setViewerCount(msg.count);
        } catch (e) {}
      } else if (event.data instanceof Blob) {
        event.data.arrayBuffer().then((buffer) => {
          bufferQueueRef.current.push(buffer);
          processQueue();
        });
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleManualPlay = () => {
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        jumpToLiveEdge();
      }).catch(() => {});
    }
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setComments((prev) => [
      { id: 'c-' + Date.now(), user: commentUser || 'Zuschauer', text: commentText.trim(), date: new Date().toISOString() },
      ...prev
    ]);
    setCommentText('');
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-3 py-3 space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="btn-secondary text-xs flex items-center gap-2">
          <ArrowLeft className="w-4 h-4 text-blue-400" />
          <span>Zurück zur Übersicht</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1 rounded bg-red-600 text-white font-mono text-xs font-bold shadow-lg animate-pulse">
          <Radio className="w-3.5 h-3.5" />
          <span>🔴 ECHTER LIVE STREAM</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Video Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-2xl border border-white/10 group flex items-center justify-center">
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isMuted}
              className="w-full h-full object-contain"
            />

            {/* Manual Play Trigger for Mobile / Safari if Autoplay Blocked */}
            {!isPlaying && (
              <button
                onClick={handleManualPlay}
                className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center space-y-3 cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-[#0055b8] text-white flex items-center justify-center shadow-2xl animate-pulse">
                  <Play className="w-8 h-8 fill-white ml-1" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">LIVE EDGE ABPIELEN</span>
              </button>
            )}

            {/* Live Indicator Overlay */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1 rounded bg-red-600 text-white text-xs font-mono font-bold border border-red-400">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <span>LIVE EDGE (&lt;100ms)</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {viewerCount} Zuschauer
              </span>
            </div>

            {/* Mute Controls */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded bg-black/70 text-white hover:bg-black transition-all border border-white/20"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="glass-panel p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  {liveStreamInfo?.title || '🔴 Live-Stream'}
                </h1>
                <p className="text-xs text-blue-400 font-mono mt-0.5">
                  Proxmox NUC Real-Time Channel
                </p>
              </div>

              <div className="px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                Latenz: &lt; 100ms
              </div>
            </div>

            <p className="text-xs text-gray-300">
              Echtzeit-Kamera-Übertragung. Nach Beendigung des Streams wird die Aufzeichnung automatisch als VOD in der Mediathek gespeichert.
            </p>
          </div>
        </div>

        {/* Live Chat */}
        <div className="glass-panel p-4 flex flex-col h-[500px]">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-white border-b border-white/10 pb-3 mb-3 font-mono">
            <MessageSquare className="w-4 h-4 text-red-500 animate-pulse" />
            <span>Live Chat</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {comments.map((c) => (
              <div key={c.id} className="p-2 rounded bg-white/[0.03] border border-white/5 space-y-0.5 text-xs">
                <span className="font-bold text-blue-400">{c.user}:</span>
                <span className="text-gray-200 ml-1">{c.text}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleCommentSubmit} className="pt-3 border-t border-white/10 space-y-2">
            <input
              type="text"
              placeholder="Dein Name..."
              value={commentUser}
              onChange={(e) => setCommentUser(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nachricht schreiben..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
              />
              <button type="submit" className="btn-primary text-xs px-3">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
}
