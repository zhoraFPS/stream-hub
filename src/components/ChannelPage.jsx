import React, { useState, useEffect } from 'react';
import { ArrowLeft, Radio, Play } from 'lucide-react';
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
      <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0055b8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>
      <button onClick={onBack} className="btn-secondary" style={{ marginTop: 16 }}>Zurück</button>
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
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 16px 48px' }}>
      {/* Back button */}
      <div style={{ padding: '12px 0' }}>
        <button onClick={onBack} className="btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Zurück zur Übersicht
        </button>
      </div>

      {/* Embedded Live Player if channel is live */}
      {liveStreamInfo && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
              🔴 JETZT LIVE auf @{channel.username}
            </h2>
          </div>
          <LivePlayer liveStreamInfo={liveStreamInfo} onBack={null} />
        </div>
      )}

      {/* Channel Header */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 32 }}>
        {/* Banner */}
        <div style={{ height: 120, background: 'linear-gradient(135deg, #030d2e 0%, #0055b8 100%)' }} />

        <div style={{ padding: '0 24px 24px', position: 'relative' }}>
          {/* Avatar */}
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #0055b8, #0068e0)', border: '4px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -40, marginBottom: 12, fontSize: 32, fontWeight: 700, color: '#fff', overflow: 'hidden' }}>
            {channel?.avatar_url ? (
              <img src={channel.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (channel?.display_name || channel?.username || '?')[0].toUpperCase()
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc' }}>
                  {channel?.display_name || channel?.username}
                </h1>
                {channel?.is_live === 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#dc2626', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 800, color: '#fff' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
                    LIVE
                  </div>
                )}
              </div>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>@{channel?.username}</p>
              {channel?.bio && <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8, maxWidth: 500 }}>{channel.bio}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>
        Videos & VODs <span style={{ fontSize: 13, color: '#475569', fontWeight: 400 }}>({videos.length})</span>
      </h2>

      {videos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569' }}>
          <Radio style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>Noch keine Videos hochgeladen</p>
          {isOwner && <p style={{ fontSize: 12, marginTop: 6 }}>Lade dein erstes Video hoch!</p>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {videos.map(video => (
            <div key={video.id} onClick={() => onSelectVideo?.(video)}
              style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', transition: 'transform 0.15s, border-color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
              {/* Thumbnail */}
              <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000' }}>
                <img src={video.thumbnail_url || video.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                {video.duration > 0 && (
                  <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.85)', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                    {formatDuration(video.duration)}
                  </div>
                )}
              </div>
              {/* Info */}
              <div style={{ padding: '10px 12px' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {video.title}
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 12, color: '#475569' }}>
                  <span>{video.views?.toLocaleString()} Aufrufe</span>
                  <span>·</span>
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
