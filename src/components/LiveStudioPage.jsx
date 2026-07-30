import React, { useState, useRef, useEffect } from 'react';
import { Radio, Camera, Mic, MicOff, RefreshCw, Square, ArrowLeft, ShieldCheck, UploadCloud, Film } from 'lucide-react';

export default function LiveStudioPage({ onBack, onStreamStarted, onStreamEnded }) {
  const [streamTitle, setStreamTitle] = useState('🔴 Handy Live-Stream');
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [isMuted, setIsMuted] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(1);
  const [cameraError, setCameraError] = useState(null);

  // File upload fallback state
  const [fileStream, setFileStream] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const videoPreviewRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize camera safely
  const initCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Direkter Web-Kamerazugriff erfordert HTTPS. Bitte nutze die Handy-Kamera Aufnahmefunktion unten!'
        );
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });

      mediaStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera access warn:', err.message);
      setCameraError(err.message);
    }
  };

  useEffect(() => {
    initCamera();
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (wsRef.current) wsRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const startLiveStream = () => {
    if (!mediaStreamRef.current) {
      alert('Kamera nicht bereit!');
      return;
    }

    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname || 'localhost';
      const wsPort = window.location.port || '5000';
      const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/live/publish`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'start',
          title: streamTitle || 'Live Stream',
          uploader: 'Handy Live Studio',
        }));

        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4';

        const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
          mimeType,
          videoBitsPerSecond: 2000000,
        });

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        mediaRecorder.start(500);
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

      ws.onerror = (err) => console.error(err);
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

  // Mobile camera direct clip recording fallback
  const handleMobileFileStream = async (file) => {
    if (!file) return;
    setIsUploadingFile(true);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', streamTitle || 'Handy Kamera Stream');
    formData.append('category', 'Gaming');
    formData.append('tags', 'Handy Live Stream');

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload fehlgeschlagen');
      alert('Live Stream Aufzeichnung erfolgreich hochgeladen!');
      if (onStreamEnded) onStreamEnded();
      onBack();
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 py-4 space-y-6">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="btn-secondary text-xs flex items-center gap-2">
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Zurück zur Übersicht</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1 rounded bg-red-600/90 text-white font-mono text-xs font-bold shadow-lg animate-pulse">
          <Radio className="w-4 h-4" />
          <span>LIVE STUDIO UNTERSEITE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Camera Viewport */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-red-500/40 flex items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center space-y-3 max-w-md">
                <Camera className="w-10 h-10 text-cyan-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">Handy Kamera Direkt-Aufnahme</h3>
                <p className="text-xs text-gray-300">
                  Nutze die Handy-Kamera Aufnahmefunktion unten, um deinen Stream-Clip direkt aufzunehmen & hochzuladen!
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary text-xs mx-auto"
                >
                  <Camera className="w-4 h-4" />
                  📱 Mit Kamera aufnehmen
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleMobileFileStream(e.target.files[0])}
                />
              </div>
            ) : (
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            )}

            {/* Live Indicator */}
            {isStreaming && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded bg-red-600/90 text-white text-xs font-mono font-bold border border-red-400">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span>LIVE</span>
                <span>•</span>
                <span>{formatTimer(streamDuration)}</span>
                <span>•</span>
                <span>{viewerCount} Zuschauer</span>
              </div>
            )}

            {/* Controls Bar */}
            {!cameraError && (
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-2 rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/80"
                >
                  {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={toggleCamera}
                  className="p-2 rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/80"
                >
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                </button>
              </div>
            )}
          </div>

          <div className="glass-panel p-5 space-y-3">
            <h2 className="font-bold text-base text-white">Live Stream Einstellungen</h2>
            <div className="space-y-2">
              <label className="text-xs text-gray-300 block">Stream Titel</label>
              <input
                type="text"
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                placeholder="Stream Titel..."
                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-red-500"
              />
            </div>
          </div>
        </div>

        {/* Right Controls Panel */}
        <div className="glass-panel p-5 space-y-4">
          <h3 className="font-bold text-sm text-white border-b border-white/10 pb-3">Stream Steuerung</h3>

          {!isStreaming ? (
            <div className="space-y-3">
              {!cameraError ? (
                <button
                  onClick={startLiveStream}
                  className="w-full py-3.5 rounded-md bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 hover:brightness-110"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>🔴 LIVE STREAM STARTEN</span>
                </button>
              ) : null}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full btn-secondary text-xs flex items-center justify-center gap-2 border-cyan-500/40 text-cyan-400"
              >
                <Camera className="w-4 h-4" />
                <span>📱 Handy Kamera Clip aufnehmen</span>
              </button>
            </div>
          ) : (
            <button
              onClick={stopLiveStream}
              className="w-full py-3.5 rounded-md bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>⏹️ LIVE STREAM BEENDEN</span>
            </button>
          )}

          <div className="p-3 rounded bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
            <div className="flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Unterseiten-Architektur
            </div>
            <p className="text-[11px] text-gray-300">
              Isolierte Unterseite zur stabilen Kamera-Übertragung ohne Render-Abstürze!
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
