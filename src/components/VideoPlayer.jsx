import React, { useRef, useState, useEffect } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, RotateCcw,
  RotateCw, ThumbsUp, Share2, MessageSquare, Send,
  ArrowLeft, CheckCircle2, Tv, Download
} from 'lucide-react';
import { formatDuration, formatViews, formatTimeAgo } from '../utils/formatters';

export default function VideoPlayer({ video, allVideos, onSelectVideo, onBack, onLike, onAddComment, systemInfo }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const [commentUser, setCommentUser] = useState('');
  const [commentText, setCommentText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const controlsTimeoutRef = useRef(null);

  // Streaming URL
  const streamUrl = video.videoUrl && video.videoUrl.startsWith('http')
    ? video.videoUrl
    : `/api/videos/${video.id}/stream`;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [video.id]);

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipTime(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipTime(5);
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, volume]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const skipTime = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        Math.max(videoRef.current.currentTime + seconds, 0),
        duration
      );
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume || 1;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  const handleCopyLink = () => {
    const hostUrl = systemInfo ? `http://${systemInfo.localIp}:${systemInfo.port}` : window.location.origin;
    const shareUrl = `${hostUrl}/#watch=${video.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(video.id, commentUser || 'Zuschauer', commentText.trim());
    setCommentText('');
  };

  const recommendedVideos = (allVideos || []).filter(v => v.id !== video.id);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 py-4 space-y-6">
      
      {/* Top Header & Navigation Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="btn-secondary text-xs flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Zurück zur VOD-Übersicht</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(0,85,184,0.1)', border: '1px solid rgba(0,85,184,0.3)', color: '#60a5fa', fontSize: 11, fontWeight: 600 }}>
          VOD Aufzeichnung
        </div>
      </div>

      {/* Main Grid: Cinema Player + Recommended Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Player & Metadata */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Cinema Video Player Canvas */}
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-2xl border border-white/10 group"
          >
            <video
              ref={videoRef}
              src={streamUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
              controls
              className="w-full h-full object-contain"
              playsInline
            />
          </div>

          {/* Video Title & Uploader Info */}
          <div className="glass-panel p-5 space-y-4">
            
            <h1 className="text-xl font-bold text-white tracking-tight">{video.title}</h1>

            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center font-bold text-sm text-blue-400">
                  {video.uploader ? video.uploader.substring(0, 2).toUpperCase() : 'SH'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white">{video.uploader || 'StreamHub'}</span>
                  </div>
                  <p className="text-xs text-gray-400">VOD Mediathek</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onLike(video.id)}
                  className="btn-secondary text-xs flex items-center gap-2"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-blue-400" />
                  <span>{video.likes || 0} Gefällt mir</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="btn-secondary text-xs flex items-center gap-2"
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Link kopiert!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Teilen</span>
                    </>
                  )}
                </button>

                <a
                  href={streamUrl}
                  download
                  className="btn-secondary text-xs flex items-center gap-2"
                  title="VOD Herunterladen"
                >
                  <Download className="w-3.5 h-3.5 text-gray-300" />
                </a>
              </div>

            </div>

            {/* Description Box */}
            <div className="p-3.5 rounded-lg bg-black/40 border border-white/5 space-y-2">
              <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                <span>{formatViews(video.views)}</span>
                <span>•</span>
                <span>{formatTimeAgo(video.createdAt)}</span>
                <span>•</span>
                <span className="text-cyan-400 font-semibold">{video.category}</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                {video.description || 'Keine Beschreibung vorhanden.'}
              </p>

              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {video.tags.map((tag, idx) => (
                    <span key={idx} className="badge-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="pt-2 space-y-4">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>Kommentare ({(video.comments && video.comments.length) || 0})</span>
              </div>

              {/* Comment Input */}
              <form onSubmit={handleCommentSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Dein Name..."
                    value={commentUser}
                    onChange={(e) => setCommentUser(e.target.value)}
                    className="w-1/3 bg-black/40 border border-white/10 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Kommentar verfassen..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                  <button type="submit" className="btn-primary text-xs">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-2">
                {video.comments && video.comments.length > 0 ? (
                  video.comments.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-md bg-white/[0.02] border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-200">{c.user}</span>
                        <span className="text-gray-500 font-mono">{formatTimeAgo(c.date)}</span>
                      </div>
                      <p className="text-xs text-gray-300">{c.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 italic py-1">Noch keine Kommentare vorhanden.</p>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Recommended VODs List */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Tv className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span>Weitere VODs</span>
          </h3>

          <div className="space-y-2.5">
            {recommendedVideos.length > 0 ? (
              recommendedVideos.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => onSelectVideo(rec)}
                  className="video-card p-2 flex flex-row gap-3 hover:bg-white/5 transition-all cursor-pointer border border-white/5"
                >
                  <div className="w-32 aspect-video bg-black rounded overflow-hidden relative shrink-0">
                    <img src={rec.thumbnailUrl} alt={rec.title} className="w-full h-full object-cover" />
                    <div className="badge-duration">{formatDuration(rec.duration)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs text-white line-clamp-2 leading-snug">{rec.title}</h4>
                    <p className="text-[11px] text-gray-400 mt-1 truncate">{rec.uploader || 'VOD'}</p>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">{formatViews(rec.views)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 glass-panel text-center text-xs text-gray-400">
                Keine weiteren VODs in der Mediathek.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
