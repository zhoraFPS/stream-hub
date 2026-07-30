import React from 'react';
import { Play, MoreVertical, Trash2, Share2, Eye, ThumbsUp } from 'lucide-react';
import { formatDuration, formatViews, formatTimeAgo } from '../utils/formatters';

export default function VideoCard({ video, onSelectVideo, onDeleteVideo, systemInfo }) {
  const [showMenu, setShowMenu] = React.useState(false);

  const handleShare = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    const hostUrl = systemInfo ? `http://${systemInfo.localIp}:${systemInfo.port}` : window.location.origin;
    const shareUrl = `${hostUrl}/#watch=${video.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert(`Lokaler Netz-Link kopiert:\n${shareUrl}`);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (confirm(`Möchtest du "${video.title}" wirklich löschen?`)) {
      onDeleteVideo(video.id);
    }
  };

  return (
    <div
      onClick={() => onSelectVideo(video)}
      className="video-card group cursor-pointer flex flex-col bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/15 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1"
    >
      {/* Thumbnail Container */}
      <div className="video-card-thumb aspect-video bg-black/50 relative">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80';
          }}
        />
        
        {/* Play Overlay Icon on Hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-xs font-mono font-semibold tracking-wider backdrop-blur-sm border border-white/10">
          {formatDuration(video.duration)}
        </div>

        {/* Category / Local Badge */}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm border border-white/10">
            {video.category}
          </span>
          {!video.isExternal && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium backdrop-blur-sm">
              Local VOD
            </span>
          )}
        </div>
      </div>

      {/* Details Footer */}
      <div className="p-3.5 flex gap-3 relative">
        {/* Uploader Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow">
          {video.uploader ? video.uploader.substring(0, 2).toUpperCase() : 'SH'}
        </div>

        {/* Title & Metadata */}
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="font-semibold text-sm text-gray-100 group-hover:text-white line-clamp-2 leading-snug transition-colors">
            {video.title}
          </h3>
          <p className="text-xs text-gray-400 mt-1 font-medium truncate">
            {video.uploader || 'Proxmox VOD'}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatViews(video.views)}
            </span>
            <span>•</span>
            <span>{formatTimeAgo(video.createdAt)}</span>
          </div>
        </div>

        {/* Option Menu Toggle */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Popup Dropdown */}
          {showMenu && (
            <div
              className="absolute right-0 bottom-8 w-44 bg-gray-900 border border-white/15 rounded-xl shadow-2xl z-20 py-1 overflow-hidden backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleShare}
                className="w-full px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/10 flex items-center gap-2 text-left"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                LAN Link kopieren
              </button>
              <button
                onClick={handleDelete}
                className="w-full px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-2 text-left"
              >
                <Trash2 className="w-3.5 h-3.5" />
                VOD Löschen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
