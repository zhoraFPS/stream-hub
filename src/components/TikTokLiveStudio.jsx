import React, { useState, useRef, useEffect } from 'react';
import { Radio, Camera, Mic, MicOff, RefreshCw, Square, ArrowLeft, Heart, MessageSquare, Send, Copy, CheckCircle2, ShieldCheck, Monitor, Smartphone, Lock } from 'lucide-react';

export default function TikTokLiveStudio({ onBack, onStreamStarted, onStreamEnded }) {
  const [activeTab, setActiveTab] = useState('phone');
  const [streamTitle, setStreamTitle] = useState('🔴 TikTok Live Stream vom Handy');
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [isMuted, setIsMuted] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(1);
  const [likeCount, setLikeCount] = useState(12);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [cameraError, setCameraError] = useState(null);

  // Live Chat
  const [chatMessages, setChatMessages] = useState([
    { id: 'c1', user: 'System', text: 'Willkommen im TikTok Live Studio! 🔥' }
  ]);
  const [chatText, setChatText] = useState('');

  // OBS Stream Key Info
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedServer, setCopiedServer] = useState(false);

  const videoPreviewRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const wsRef = useRef(null);
  const timerRef = useRef(null);

  const currentHost = window.location.hostname || 'localhost';
  const currentPort = window.location.port || '5000';
  const rtmpServerUrl = `rtmp://${currentHost}:1935/live`;
  const streamKey = `streamhub_live_${currentHost.replace(/\./g, '_')}`;

  // iOS Safari Requirement: Must be called directly inside user tap gesture handler!
  const requestCameraAccess = async (targetFacingMode = facingMode) => {
    setCameraError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'iOS Safari Sicherheitsbeschränkung: Für den Kamera-Live-Zugriff benötigt dein iPhone eine HTTPS-Verbindung. Öffne die Seite über https:// oder nutze den OBS-Modus!'
        );
      }

      // iOS Safari compatible constraints
      let constraints = {
        video: { facingMode: targetFacingMode },
        audio: true,
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        // Fallback for simple constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }

      mediaStreamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        // iOS Safari critical attributes
        videoPreviewRef.current.setAttribute('playsinline', 'true');
        videoPreviewRef.current.setAttribute('muted', 'true');
        await videoPreviewRef.current.play().catch(() => {});
      }

      setCameraActive(true);
    } catch (err) {
      console.error('iOS Camera access error:', err);
      setCameraError(err.message || 'Kamera-Zugriff vom iOS-System verweigert.');
    }
  };

  const toggleCamera = () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    requestCameraAccess(newFacingMode);
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleLikeClick = () => {
    setLikeCount((prev) => prev + 1);
    const id = Date.now();
    setFloatingHearts((prev) => [...prev, { id, left: Math.random() * 60 + 20 }]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2000);
  };

  const startLiveStream = () => {
    if (!mediaStreamRef.current) {
      alert('Bitte tippe zuerst auf "Kamera Freigeben"!');
      return;
    }

    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${currentHost}:${currentPort}/live/publish`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'start',
          title: streamTitle || 'TikTok Live Stream',
          uploader: 'Handy Live Studio',
        }));

        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4';

        const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
          mimeType,
          videoBitsPerSecond: 2500000,
        });

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        mediaRecorder.start(400);
        setIsStreaming(true);
        setStreamDuration(0);

        timerRef.current = setInterval(() => {
          setStreamDuration((prev) => prev + 1);
        }, 1000);

        if (onStreamStarted) onStreamStarted();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'viewers') setViewerCount(msg.count);
        } catch (e) {}
      };

      ws.onclose = () => stopLiveStream();

    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  };

  const stopLiveStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
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
    setChatMessages((prev) => [
      ...prev,
      { id: 'c-' + Date.now(), user: 'Ich', text: chatText.trim() }
    ]);
    setChatText('');
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-3 py-3 space-y-4">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="btn-secondary text-xs flex items-center gap-2">
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Zurück zur Übersicht</span>
        </button>

        {/* Tab Switcher: Phone vs OBS */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-md border border-white/10">
          <button
            onClick={() => setActiveTab('phone')}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'phone' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Handy Kamera (iOS)</span>
          </button>
          <button
            onClick={() => setActiveTab('obs')}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'obs' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>OBS Studio</span>
          </button>
        </div>
      </div>

      {activeTab === 'phone' ? (
        /* TikTok-Style Live Camera Viewport Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Vertical TikTok Live Canvas */}
          <div className="lg:col-span-2 relative max-w-sm mx-auto lg:max-w-none w-full aspect-[9/16] lg:aspect-[16/9] bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-red-500/40 flex flex-col justify-between p-4">
            
            {/* Camera Preview */}
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

            {/* iOS User Gesture Trigger Banner if Camera Not Active */}
            {!cameraActive && (
              <div className="absolute inset-0 bg-black/90 z-30 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <Camera className="w-12 h-12 text-red-500 animate-bounce" />
                <h3 className="text-base font-bold text-white">Handy Kamera Freischalten</h3>
                <p className="text-xs text-gray-300 max-w-xs leading-relaxed">
                  iOS Safari verlangt ein einmaliges Antippen, um Mikrofon und Kamera freizugeben.
                </p>
                
                {cameraError ? (
                  <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                    {cameraError}
                  </div>
                ) : (
                  <button
                    onClick={() => requestCameraAccess()}
                    className="py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold text-sm shadow-xl shadow-red-600/40 hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>📷 KAMERA FREIGEBEN (iOS TAP)</span>
                  </button>
                )}
              </div>
            )}

            {/* Top Stream Overlay Bar */}
            <div className="relative z-10 flex items-center justify-between text-white text-xs font-semibold">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <span className="font-mono">{isStreaming ? '🔴 LIVE' : 'BEREIT'}</span>
                {isStreaming && <span>• {formatTimer(streamDuration)}</span>}
              </div>

              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 font-mono">
                <span className="text-cyan-400">{viewerCount} Zuschauer</span>
                <span>•</span>
                <span className="text-pink-400 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
                  {likeCount}
                </span>
              </div>
            </div>

            {/* Floating TikTok Hearts Container */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
              {floatingHearts.map((h) => (
                <div
                  key={h.id}
                  style={{ left: `${h.left}%` }}
                  className="absolute bottom-16 animate-bounce text-pink-500"
                >
                  <Heart className="w-8 h-8 fill-pink-500 text-pink-400 drop-shadow-lg" />
                </div>
              ))}
            </div>

            {/* Bottom Stream Controls & TikTok Chat Overlay */}
            <div className="relative z-10 space-y-3 mt-auto">
              
              {/* Floating Chat Overlay */}
              <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-none pr-2">
                {chatMessages.map((c) => (
                  <div key={c.id} className="inline-block bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white border border-white/10 max-w-[85%]">
                    <span className="font-bold text-cyan-400 mr-1.5">{c.user}:</span>
                    <span>{c.text}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                {!isStreaming ? (
                  <button
                    onClick={startLiveStream}
                    disabled={!cameraActive}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 via-pink-600 to-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-600/40 hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Radio className="w-5 h-5 animate-pulse" />
                    <span>🔴 TIKTOK LIVE STARTEN</span>
                  </button>
                ) : (
                  <button
                    onClick={stopLiveStream}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl hover:bg-red-700 transition-all cursor-pointer"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>⏹️ STREAM BEENDEN</span>
                  </button>
                )}

                {/* Like / Heart Tap */}
                <button
                  onClick={handleLikeClick}
                  className="p-3 rounded-xl bg-pink-600/80 hover:bg-pink-500 text-white shadow-lg transition-all transform active:scale-125"
                  title="Herz absenden"
                >
                  <Heart className="w-5 h-5 fill-white" />
                </button>

                {/* Switch Camera */}
                <button
                  onClick={toggleCamera}
                  className="p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition-all"
                  title="Kamera wechseln"
                >
                  <RefreshCw className="w-5 h-5 text-cyan-400" />
                </button>

                {/* Mute */}
                <button
                  onClick={toggleMute}
                  className="p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition-all"
                  title="Mikrofon stummschalten"
                >
                  {isMuted ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5 text-emerald-400" />}
                </button>
              </div>

            </div>

          </div>

          {/* Settings Sidebar */}
          <div className="glass-panel p-5 space-y-4">
            <h3 className="font-bold text-sm text-white border-b border-white/10 pb-3">TikTok Live Optionen</h3>

            <div className="space-y-2">
              <label className="text-xs text-gray-300 block">Live-Stream Titel</label>
              <input
                type="text"
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                placeholder="Live Titel..."
                className="w-full bg-black/50 border border-white/15 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-red-500"
              />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="space-y-2 pt-2 border-t border-white/10">
              <label className="text-xs text-gray-300 block">Live Chat Nachricht</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Chat Nachricht..."
                  className="flex-1 bg-black/50 border border-white/15 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                />
                <button type="submit" className="btn-primary text-xs px-3">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

        </div>
      ) : (
        /* OBS Studio Stream Key Integration */
        <div className="glass-panel p-6 space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">OBS Studio / Streamlabs Einbindung</h2>
              <p className="text-xs text-gray-400">Streame direkt von deinem PC mit OBS Studio auf deinen NUC</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Server URL (RTMP)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={rtmpServerUrl}
                  className="flex-1 bg-black/50 border border-white/15 rounded-md px-3 py-2 text-xs font-mono text-cyan-400 outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(rtmpServerUrl);
                    setCopiedServer(true);
                    setTimeout(() => setCopiedServer(false), 2000);
                  }}
                  className="btn-secondary text-xs"
                >
                  {copiedServer ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Stream-Schlüssel (Stream Key)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={streamKey}
                  className="flex-1 bg-black/50 border border-white/15 rounded-md px-3 py-2 text-xs font-mono text-pink-400 outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(streamKey);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="btn-secondary text-xs"
                >
                  {copiedKey ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
