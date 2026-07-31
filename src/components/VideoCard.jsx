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
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tagen`;
}

export default function VideoCard({ video, onSelectVideo, onDeleteVideo }) {
  return (
    <div className="video-card" onClick={() => onSelectVideo(video)}>
      <div className="video-card-thumb">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          loading="lazy"
        />

        <span className="badge-duration">{formatDuration(video.duration)}</span>

        {onDeleteVideo && (
          <button
            className="video-card-delete"
            title="Video löschen"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteVideo(video.id);
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="video-card-info">
        <h3 className="video-card-title">{video.title}</h3>

        <p className="video-card-meta">
          <span>{video.uploader || 'Unbekannt'}</span>
          <span>•</span>
          <span>{formatRelativeTime(video.createdAt || video.created_at)}</span>
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Eye size={12} />
            {video.views ?? 0}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ThumbsUp size={12} />
            {video.likes ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}
