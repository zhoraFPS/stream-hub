import React from 'react';
import { Trash2, Eye, ThumbsUp } from 'lucide-react';

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 3600) return 'Gerade eben';
  const hours = Math.floor(diff / 3600);
  if (hours < 24) return `vor ${hours} Stunden`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tagen`;
}

export default function VideoCard({ video, onSelectVideo, onDeleteVideo, systemInfo }) {
  return (
    <div className="video-card" onClick={() => onSelectVideo(video)}>
      <div className="video-card-thumb">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          loading="lazy"
        />

        <span className="badge-duration">{formatDuration(video.duration)}</span>

        <button
          className="video-card-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteVideo(video.id);
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="video-card-info">
        <h3 className="video-card-title">{video.title}</h3>

        <p className="video-card-meta">
          {video.uploader || 'Unbekannt'} • {formatRelativeTime(video.createdAt)}
        </p>

        <div className="video-card-stats">
          <span className="video-card-stat">
            <Eye size={12} />
            {video.views ?? 0}
          </span>
          <span className="video-card-stat">
            <ThumbsUp size={12} />
            {video.likes ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}
