import React, { useState, useEffect } from 'react';
import LivePlayer from './LivePlayer';
import VideoCard from './VideoCard';
import SectionTitle from './ui/SectionTitle';
import Icon from './ui/Icon';

export default function ChannelPage({ username, currentUser, authToken, onBack, onSelectVideo }) {
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isOwner = currentUser?.username?.toLowerCase() === username?.toLowerCase();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/channels/${username}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else { setChannel(data.channel); setVideos(data.videos || []); setError(''); }
      })
      .catch(() => setError('Der Kanal konnte nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, [username]);

  const backButton = (
    <button type="button" className="b-button b-button--secondary b-button--s" onClick={onBack}>
      <Icon name="arrow-left" size={16} />
      Zur Mediathek
    </button>
  );

  if (loading) {
    return (
      <div className="b-section" style={{ display: 'flex', justifyContent: 'center', paddingBlock: 'var(--space-2xl)' }}>
        <div className="b-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="b-section">
        <div style={{ paddingBlockEnd: 'var(--space-s)' }}>{backButton}</div>
        <div className="b-notice b-notice--error">{error}</div>
      </div>
    );
  }

  const displayName = channel?.display_name || channel?.username;
  const isLive = channel?.is_live === 1;

  const liveStreamInfo = isLive ? {
    id: `live-obs-${channel.id}`,
    userId: channel.id,
    username: channel.username,
    stream_key: channel.stream_key,
    title: channel.live_title || `${displayName} — Live`,
    uploader: displayName,
    isLive: true,
  } : null;

  return (
    <div>
      <div style={{ paddingBlockEnd: 'var(--space-s)' }}>{backButton}</div>

      {liveStreamInfo && (
        <section className="b-section">
          <SectionTitle title="Jetzt live" presenter={<span>@{channel.username}</span>} />
          <LivePlayer liveStreamInfo={liveStreamInfo} onBack={null} />
        </section>
      )}

      <section className="b-section b-section--compact">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-s)', flexWrap: 'wrap' }}>
          <span className="b-avatar b-avatar--xl">
            {channel?.avatar_url
              ? <img src={channel.avatar_url} alt="" />
              : (displayName || '?')[0].toUpperCase()}
          </span>
          <div style={{ flex: '1 1 280px' }}>
            <div className="b-row">
              <h1 className="b-heading b-heading--600">{displayName}</h1>
              {isLive && <span className="b-badge b-badge--live b-badge--static">Live</span>}
            </div>
            <div className="b-meta-line" style={{ marginTop: 'var(--space-3xs)' }}>
              <span className="b-meta-line__item">@{channel?.username}</span>
              <span className="b-meta-line__item">{videos.length} Videos</span>
            </div>
            {channel?.bio && (
              <p className="b-copy" style={{ marginTop: 'var(--space-2xs)' }}>{channel.bio}</p>
            )}
          </div>
        </div>
      </section>

      <section className="b-section">
        <SectionTitle title="Videos" count={videos.length} />

        {videos.length === 0 ? (
          <div className="b-empty">
            <h3 className="b-heading b-heading--500">Noch keine Videos</h3>
            <p className="b-copy" style={{ margin: 'var(--space-2xs) auto 0' }}>
              {isOwner
                ? 'Lade dein erstes Video über „Hochladen" in der Kopfzeile hoch.'
                : `${displayName} hat bisher nichts veröffentlicht.`}
            </p>
          </div>
        ) : (
          <div className="b-grid">
            {videos.map(video => (
              <VideoCard
                key={video.id}
                video={{ ...video, thumbnailUrl: video.thumbnail_url || video.thumbnailUrl }}
                onSelectVideo={onSelectVideo}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
