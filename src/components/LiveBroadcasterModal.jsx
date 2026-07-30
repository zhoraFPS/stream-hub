import React, { useState, useRef, useEffect } from 'react';
import { X, Radio, Camera, Mic, MicOff, RefreshCw, Square, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function LiveBroadcasterModal({ isOpen, onClose, onStreamStarted, onStreamEnded }) {
  const [streamTitle, setStreamTitle] = useState('🔴 Live-Stream vom Smartphone');
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [isMuted, setIsMuted] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(1);
  const [errorMsg, setErrorMsg] = useState(null);

  const videoPreviewRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const wsRef = useRef(null);
  const timerRef = useRef(null);

  if (!isOpen) return null;

  // Initialize camera with HTTPS / HTTP safety guards
  const initCamera = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'HTTP-Sicherheitsbeschränkung des Mobil-Browsers: Kamera-Direktzugriff benötigt HTTPS. Bitte nutze die Handy-Kamera Aufnahmefunktion oder verbinde dich über HTTPS!'
        );
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints = {
        video: { facingMode },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera init error:', err);
      setErrorMsg(err.message);
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
        console.log('WebSocket Live Publisher Connected');
        ws.send(JSON.stringify({
          type: 'start',
          title: streamTitle || 'Live Stream',
          uploader: 'Handy Live Cam',
        }));

        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
        }

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
          if (msg.type === 'viewers') {
            setViewerCount(msg.count);
          }
        } catch (e) {}
      };

      ws.onerror = (err) => {
        console.error('WebSocket Live Error:', err);
      };

      ws.onclose = () => {
        stopLiveStream();
      };

    } catch (err) {
      alert('Fehler beim Starten des Live-Streams: ' + err.message);
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
    onClose();
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3">
      <div className="bg-[#07090e] border border-cyan-500/30 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] relative">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            <h2 className="font-bold text-sm text-white">Handy Live-Stream Kamera</h2>
          </div>
          <button
            onClick={isStreaming ? stopLiveStream : onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Camera Viewport */}
        <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center border-b border-white/10">
          {errorMsg ? (
            <div className="p-6 text-center space-y-2 max-w-sm">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-xs text-amber-300 font-semibold">{errorMsg}</p>
              <p className="text-[11px] text-gray-400">
                Tipp: Nutze die Handy-Kamera Direkt-Aufnahme im Upload-Menü oder öffne die Seite über HTTPS.
              </p>
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

          {/* Live Status Overlay */}
          {isStreaming && (
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded bg-red-600/90 text-white text-xs font-mono font-bold shadow-lg border border-red-400">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <span>LIVE</span>
              <span>•</span>
              <span>{formatTimer(streamDuration)}</span>
              <span>•</span>
              <span>{viewerCount} Zuschauer</span>
            </div>
          )}

          {/* Controls Bar on Camera */}
          {!errorMsg && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="p-2 rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/80 transition-all"
                title="Mikrofon stummschalten"
              >
                {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
              </button>
              <button
                type="button"
                onClick={toggleCamera}
                className="p-2 rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/80 transition-all"
                title="Kamera wechseln"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          )}
        </div>

        {/* Live Form & Controls */}
        <div className="p-4 space-y-4">
          {!isStreaming ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Stream Titel</label>
                <input
                  type="text"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  placeholder="z.B. 🔴 Live-Stream vom Handy im NUC-Netz"
                  className="w-full bg-black/50 border border-white/15 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                />
              </div>

              {!errorMsg ? (
                <button
                  type="button"
                  onClick={startLiveStream}
                  className="w-full py-3 rounded-md bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 hover:brightness-110 transition-all cursor-pointer"
                >
                  <Radio className="w-5 h-5 animate-pulse" />
                  <span>🔴 REAL-TIME LIVE STREAM STARTEN</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                  }}
                  className="w-full btn-secondary text-xs"
                >
                  Schließen
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono font-bold flex items-center justify-center gap-2 animate-pulse">
                <Radio className="w-4 h-4" />
                <span>DU STREAMST JETZT LIVE AUF PROXMOX NUC!</span>
              </div>

              <button
                type="button"
                onClick={stopLiveStream}
                className="w-full py-3 rounded-md bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-red-700 transition-all cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>⏹️ LIVE STREAM BEENDEN & ALS VOD SPEICHERN</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
