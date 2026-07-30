import React, { useRef, useState, useEffect } from 'react';
import { Radio, Users, Volume2, VolumeX, Maximize, ArrowLeft, ShieldCheck, MessageSquare, Send } from 'lucide-react';

export default function LivePlayer({ liveStreamInfo, onBack }) {
  const videoRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const wsRef = useRef(null);

  const [viewerCount, setViewerCount] = useState(liveStreamInfo?.viewers || 1);
  const [isMuted, setIsMuted] = useState(false);
  const [comments, setComments] = useState([
    { id: 'c1', user: 'FiveM Admin', text: '🔴 Live-Stream auf Proxmox gestartet!', date: new Date().toISOString() }
  ]);
  const [commentText, setCommentText] = useState('');
  const [commentUser, setCommentUser] = useState('');

  useEffect(() => {
    // Setup MediaSource extension for WebSocket Live Streaming
    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;

    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(mediaSource);
    }

    mediaSource.addEventListener('sourceopen', () => {
      try {
        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaSource.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
        
        const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
        sourceBufferRef.current = sourceBuffer;
        sourceBuffer.mode = 'sequence';
      } catch (err) {
        console.error('MediaSource addSourceBuffer error:', err);
      }
    });

    // Connect WebSocket live viewer
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
          if (msg.type === 'viewers') {
            setViewerCount(msg.count);
          }
        } catch (e) {}
      } else if (event.data instanceof Blob) {
        event.data.arrayBuffer().then((buffer) => {
          if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
            try {
              sourceBufferRef.current.appendBuffer(buffer);
            } catch (e) {
              console.error('Buffer append error:', e);
            }
          }
        });
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

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
    <div className="w-full max-w-[1440px] mx-auto px-4 py-4 space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="btn-secondary text-xs flex items-center gap-2">
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Zurück zur Übersicht</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1 rounded bg-red-600/90 text-white font-mono text-xs font-bold shadow-lg animate-pulse">
          <Radio className="w-3.5 h-3.5" />
          <span>🔴 ECHTER HANDY LIVE STREAM</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Video Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-2xl border border-red-500/40 group">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isMuted}
              className="w-full h-full object-contain"
            />

            {/* Live Indicator Overlay */}
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded bg-red-600/90 text-white text-xs font-mono font-bold border border-red-400">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <span>LIVE BROADCAST</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {viewerCount} Zuschauer
              </span>
            </div>

            {/* Mute Controls */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded bg-black/60 text-white hover:bg-black/80 transition-all border border-white/10"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="glass-panel p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {liveStreamInfo?.title || '🔴 Live Stream vom Smartphone'}
                </h1>
                <p className="text-xs text-cyan-400 font-mono mt-0.5">
                  Proxmox NUC Real-Time WebSocket Channel
                </p>
              </div>

              <div className="px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                Latenz: &lt; 100ms
              </div>
            </div>

            <p className="text-xs text-gray-300">
              Dieser Live-Stream wird gerade in Echtzeit von der Handy-Kamera übertragen. Nach Beendigung des Streams steht die Aufzeichnung automatisch als VOD in der Mediathek bereit!
            </p>
          </div>
        </div>

        {/* Live Chat */}
        <div className="glass-panel p-4 flex flex-col h-[500px]">
          <div className="flex items-center gap-2 font-bold text-sm text-white border-b border-white/10 pb-3 mb-3">
            <MessageSquare className="w-4 h-4 text-red-500 animate-pulse" />
            <span>Live Chat</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {comments.map((c) => (
              <div key={c.id} className="p-2 rounded bg-white/[0.03] border border-white/5 space-y-0.5 text-xs">
                <span className="font-bold text-cyan-400">{c.user}</span>
                <p className="text-gray-200">{c.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleCommentSubmit} className="pt-3 border-t border-white/10 space-y-2">
            <input
              type="text"
              placeholder="Dein Name..."
              value={commentUser}
              onChange={(e) => setCommentUser(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-red-500"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nachricht schreiben..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-red-500"
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
