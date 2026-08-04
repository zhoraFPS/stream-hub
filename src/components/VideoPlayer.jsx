import React, { useRef, useState, useEffect } from 'react';
import Plyr from 'plyr';
import VideoCard from './VideoCard';
import SectionTitle from './ui/SectionTitle';
import Icon from './ui/Icon';
import { formatDate, formatTimeAgo } from '../utils/formatters';
import { categoryLabel } from '../constants/categories';

export default function VideoPlayer({
  video, allVideos, onSelectVideo, onBack, onOpenChannel, authToken,
}) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likes || 0);
  const [liked, setLiked] = useState(false);

  const uploaderName = video.display_name || video.username || video.uploader || 'VfL Redaktion';
  const uploaderUsername = video.username;

  const streamUrl = video.videoUrl && video.videoUrl.startsWith('http')
    ? video.videoUrl
    : `/api/videos/${video.id}/stream`;

  useEffect(() => {
    setLikeCount(video.likes || 0);
    setLiked(false);
  }, [video.id]);

  useEffect(() => {
    if (!videoRef.current) return;

    const player = new Plyr(videoRef.current, {
      autoplay: true,
      controls: ['play-large', 'play', 'progress', 'current-time', 'duration',
                 'mute', 'volume', 'settings', 'pip', 'fullscreen'],
      settings: ['speed'],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      tooltips: { controls: true, seek: true },
      keyboard: { focused: true, global: true },
    });

    playerRef.current = player;
    return () => { try { player.destroy(); } catch {} };
  }, [streamUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/#watch=${video.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleLike = async () => {
    if (!authToken || liked) return;
    setLikeCount(c => c + 1);
    setLiked(true);
    try {
      const res = await fetch(`/api/videos/${video.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error();
    } catch {
      setLikeCount(c => Math.max(0, c - 1));
      setLiked(false);
    }
  };

  const related = (allVideos || []).filter(v => v.id !== video.id).slice(0, 10);

  return (
    <div className="b-section">
      <div style={{ paddingBlockEnd: 'var(--space-s)' }}>
        <button type="button" className="b-button b-button--secondary b-button--s" onClick={onBack}>
          <Icon name="arrow-left" size={16} />
          Zur Mediathek
        </button>
      </div>

      <div className="b-watch">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)', minWidth: 0 }}>
          <div className="b-stage">
            <video ref={videoRef} src={streamUrl} playsInline controls style={{ width: '100%' }} />
          </div>

          <div>
            <h1 className="b-heading b-heading--500">{video.title}</h1>
            <div className="b-meta-line" style={{ marginTop: 'var(--space-3xs)' }}>
              <span className="b-meta-line__item">{formatDate(video.createdAt || video.created_at)}</span>
              <span className="b-meta-line__item">{categoryLabel(video.category)}</span>
              <span className="b-meta-line__item">{video.views || 0} Aufrufe</span>
            </div>
          </div>

          <div className="b-panel" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 'var(--space-s)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)' }}>
              <span className="b-avatar b-avatar--l">
                {video.avatar_url
                  ? <img src={video.avatar_url} alt="" />
                  : uploaderName[0].toUpperCase()}
              </span>
              <div>
                <div className="b-heading b-heading--200">{uploaderName}</div>
                {uploaderUsername && (
                  <div className="b-meta-line__item">@{uploaderUsername}</div>
                )}
              </div>
              {uploaderUsername && onOpenChannel && (
                <button type="button" className="b-button b-button--secondary b-button--s"
                  style={{ marginLeft: 'var(--space-2xs)' }}
                  onClick={() => onOpenChannel(uploaderUsername)}>
                  Kanal ansehen
                </button>
              )}
            </div>

            <div className="b-row">
              {authToken && (
                <button type="button" className="b-button b-button--ghost b-button--s"
                  onClick={handleLike} disabled={liked}>
                  Gefällt mir · {likeCount}
                </button>
              )}
              <button type="button" className="b-button b-button--ghost b-button--s" onClick={handleCopyLink}>
                {copiedLink ? 'Link kopiert' : 'Teilen'}
              </button>
              <a href={streamUrl} download className="b-button b-button--ghost b-button--s">
                Herunterladen
              </a>
            </div>
          </div>

          <div className="b-panel">
            <div className="b-label" style={{ marginBottom: 'var(--space-3xs)' }}>Beschreibung</div>
            <p className="b-copy b-copy--front" style={{ whiteSpace: 'pre-line' }}>
              {video.description || 'Für dieses Video liegt keine Beschreibung vor.'}
            </p>
            <div className="b-meta-line" style={{ marginTop: 'var(--space-s)' }}>
              <span className="b-meta-line__item">
                Veröffentlicht {formatTimeAgo(video.createdAt || video.created_at)}
              </span>
            </div>
          </div>
        </div>

        <aside style={{ minWidth: 0 }}>
          <SectionTitle title="Mehr" />
          {related.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
              {related.map(rec => (
                <VideoCard
                  key={rec.id}
                  compact
                  video={{ ...rec, thumbnailUrl: rec.thumbnail_url || rec.thumbnailUrl }}
                  onSelectVideo={onSelectVideo}
                />
              ))}
            </div>
          ) : (
            <p className="b-copy">Weitere Videos erscheinen hier, sobald die Mediathek wächst.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
