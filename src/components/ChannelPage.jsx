import React, { useState, useEffect } from 'react';
import LivePlayer from './LivePlayer';

export default function ChannelPage({ username, currentUser, authToken, onBack, onSelectVideo }) {
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isOwner = currentUser?.username?.toLowerCase() === username?.toLowerCase();

  useEffect(() => {
    fetch(`/api/channels/${username}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else { setChannel(data.channel); setVideos(data.videos || []); }
      })
      .catch(() => setError('Kanal konnte nicht geladen werden'))
      .finally(() => setLoading(false));
  }, [username]);

  const formatDuration = (secs) => {
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (str) => {
    if (!str) return '';
    return new Date(str).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0055b8', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 900, textTransform: 'uppercase' }}>{error}</p>
      <button onClick={onBack} className="btn-secondary" style={{ marginTop: 16 }}>ZURÜCK</button>
    </div>
  );

  const liveStreamInfo = channel?.is_live === 1 ? {
    id: `live-obs-${channel.id}`,
    userId: channel.id,
    username: channel.username,
    stream_key: channel.stream_key,
    title: channel.live_title || `${channel.display_name || channel.username}'s Stream`,
    uploader: channel.display_name || channel.username,
    isLive: true,
  } : null;

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 20px 48px' }}>
      {/* Back button */}
      <div style={{ padding: '16px 0' }}>
        <button onClick={onBack} className="btn-secondary" style={{ fontSize: 11 }}>
          ← ZURÜCK ZUR ÜBERSICHT
        </button>
      </div>

      {/* Embedded Live Player if channel is live */}
      {liveStreamInfo && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div className="live-badge">
              LIVE
            </div>
            <h2 style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              JETZT LIVE AUF @{channel.username}
            </h2>
          </div>
          <LivePlayer liveStreamInfo={liveStreamInfo} onBack={null} />
        </div>
      )}

      {/* Channel Header */}
      <div style={{ background: 'var(--bg-card)', overflow: 'hidden', marginBottom: 32 }}>
        {/* Banner */}
        <div style={{ height: 140, background: '#0055b8' }} />

        <div style={{ padding: '0 32px 32px', position: 'relative' }}>
          {/* Avatar */}
          <div style={{ width: 88, height: 88, background: '#020714', border: '4px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -44, marginBottom: 16, fontSize: 36, fontWeight: 900, color: '#ffffff', overflow: 'hidden' }}>
            {channel?.avatar_url ? (
              <img src={channel.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (channel?.display_name || channel?.username || '?')[0].toUpperCase()
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {channel?.display_name || channel?.username}
                </h1>
                {channel?.is_live === 1 && (
                  <div className="live-badge">
                    LIVE
                  </div>
                )}
              </div>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#64748b', marginTop: 4 }}>@{channel?.username}</p>
              {channel?.bio && <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 10, maxWidth: 640, lineHeight: 1.5 }}>{channel.bio}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      <h2 style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        VIDEOS & VODS <span style={{ fontSize: 12, color: '#64748b', fontWeight: 800 }}>({videos.length})</span>
      </h2>

      {videos.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: 14, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>NOCH KEINE VIDEOS HOCHGELADEN</p>
          {isOwner && <p style={{ fontSize: 12, marginTop: 8, color: '#64748b' }}>LADE DEIN ERSTES VIDEO OBEN ÜBER DER SEITE HOCH.</p>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {videos.map(video => (
            <div key={video.id} onClick={() => onSelectVideo?.(video)} className="video-card">
              {/* Thumbnail */}
              <div className="video-card-thumb">
                <img src={video.thumbnail_url || video.thumbnailUrl} alt="" onError={e => e.target.style.display = 'none'} />
                {video.duration > 0 && (
                  <div className="badge-duration">
                    {formatDuration(video.duration)}
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="video-card-info">
                <p className="video-card-title">
                  {video.title}
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 11, fontWeight: 800, color: '#64748b' }}>
                  <span>{video.views?.toLocaleString()} AUFRUFE</span>
                  <span>•</span>
                  <span>{formatDate(video.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
