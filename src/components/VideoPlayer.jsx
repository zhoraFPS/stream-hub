import React, { useRef, useState, useEffect } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, RotateCcw,
  RotateCw, ThumbsUp, Share2, MessageSquare, Send, Sparkles,
  ArrowLeft, CheckCircle2
} from 'lucide-react';
import { formatDuration, formatViews, formatTimeAgo } from '../utils/formatters';

export default function VideoPlayer({ video, onBack, onLike, onAddComment, systemInfo }) {
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

  // Set video source
  const streamUrl = video.videoUrl.startsWith('http')
    ? video.videoUrl
    : `/api/videos/${video.id}/stream`;

  // Autoplay on load
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [video.id]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'KeyJ':
          e.preventDefault();
          skipTime(-5);
          break;
        case 'ArrowRight':
        case 'KeyL':
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
    }, 3000);
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
    onAddComment(video.id, commentUser || 'Netzwerk User', commentText.trim());
    setCommentText('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
      
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurück zur Übersicht
      </button>

      {/* Video Player Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="relative bg-black rounded-2xl overflow-hidden aspect-video shadow-2xl group border border-white/10"
      >
        <video
          ref={videoRef}
          src={streamUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
        />

        {/* Video Overlay Controls */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-between p-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Top Info Bar inside Fullscreen */}
          <div className="flex justify-between items-center text-white text-sm font-semibold drop-shadow-md">
            <span>{video.title}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-red-600/80 border border-red-500/40">
              Low Latency HTTP 206
            </span>
          </div>

          {/* Center Play Big Icon when paused */}
          {!isPlaying && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
            >
              <div className="w-20 h-20 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transform hover:scale-110 transition-transform">
                <Play className="w-10 h-10 fill-white ml-1" />
              </div>
            </div>
          )}

          {/* Bottom Bar: Timeline & Controls */}
          <div className="space-y-2 mt-auto">
            
            {/* Timeline Slider */}
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="player-slider"
              />
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between text-white text-sm">
              
              {/* Left Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Play/Pause (Leertaste)"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                </button>

                <button
                  onClick={() => skipTime(-5)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white"
                  title="5 Sek. zurück (<-)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => skipTime(5)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white"
                  title="5 Sek. vor (->)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-2 group/vol">
                  <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5 text-red-400" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                {/* Time Display */}
                <span className="text-xs font-mono text-gray-300 ml-2">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2">
                
                {/* Playback Speed Selector */}
                <select
                  value={playbackSpeed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="bg-black/60 border border-white/20 text-xs text-white rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                >
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">1.0x (Normal)</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2.0x</option>
                </select>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Vollbild (F)"
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* Video Details & Interaction Section */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-white tracking-tight">{video.title}</h1>

        {/* Uploader, Views, Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-pink-600 to-red-500 flex items-center justify-center text-white font-bold shadow-md">
              {video.uploader ? video.uploader.substring(0, 2).toUpperCase() : 'SH'}
            </div>
            <div>
              <p className="font-semibold text-white">{video.uploader || 'Proxmox VOD'}</p>
              <p className="text-xs text-gray-400">Lokaler Netz-Stream</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Like Button */}
            <button
              onClick={() => onLike(video.id)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <ThumbsUp className="w-4 h-4 text-pink-500" />
              <span>{video.likes || 0} Gefällt mir</span>
            </button>

            {/* Share Link */}
            <button
              onClick={handleCopyLink}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Link kopiert!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span>Teilen</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Description & Tags */}
        <div className="bg-black/30 rounded-xl p-4 border border-white/5 space-y-2">
          <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
            <span>{formatViews(video.views)}</span>
            <span>•</span>
            <span>{formatTimeAgo(video.createdAt)}</span>
            <span>•</span>
            <span className="text-cyan-400 font-semibold">{video.category}</span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
            {video.description || 'Keine Beschreibung vorhanden.'}
          </p>

          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {video.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-md bg-white/5 text-gray-300 text-xs font-mono border border-white/10"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="pt-4 space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg text-white">
            <MessageSquare className="w-5 h-5 text-red-500" />
            <span>Kommentare ({(video.comments && video.comments.length) || 0})</span>
          </div>

          {/* New Comment Input */}
          <form onSubmit={handleCommentSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Dein Name (optional)..."
              value={commentUser}
              onChange={(e) => setCommentUser(e.target.value)}
              className="w-full max-w-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Öffentlichen Kommentar hinzufügen..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
              />
              <button type="submit" className="btn-primary text-sm">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Comment List */}
          <div className="space-y-3 pt-2">
            {video.comments && video.comments.length > 0 ? (
              video.comments.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-200">{c.user}</span>
                    <span className="text-gray-500">{formatTimeAgo(c.date)}</span>
                  </div>
                  <p className="text-sm text-gray-300">{c.text}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic py-2">Noch keine Kommentare vorhanden.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
