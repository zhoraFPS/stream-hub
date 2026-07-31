import React from 'react';

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
  if (diff < 3600) return 'GERADE EBEN';
  const hours = Math.floor(diff / 3600);
  if (hours < 24) return `VOR ${hours} STD.`;
  const days = Math.floor(hours / 24);
  return `VOR ${days} TAGEN`;
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
            LÖSCHEN
          </button>
        )}
      </div>

      <div className="video-card-info">
        <h3 className="video-card-title">{video.title}</h3>

        <div className="video-card-meta">
          <span>{video.uploader || 'UNBEKANNT'}</span>
          <span style={{ margin: '0 4px', color: '#64748b' }}>•</span>
          <span>{formatRelativeTime(video.createdAt || video.created_at)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 11, color: '#64748b', fontWeight: 800 }}>
          <span>{video.views ?? 0} AUFRUFE</span>
          <span>•</span>
          <span>{video.likes ?? 0} LIKES</span>
        </div>
      </div>
    </div>
  );
}
