import React from 'react';
import Media from './ui/Media';
import { formatDuration, formatDate, formatViews } from '../utils/formatters';
import Icon from './ui/Icon';
import { categoryLabel, matchLabel, accessLabel } from '../constants/categories';

/**
 * Video-Kachel nach dem b-card-article Muster: transparente Fläche,
 * Bild trägt die Struktur, darunter Titel und Meta-Zeile.
 */
export default function VideoCard({ video, onSelectVideo, onDeleteVideo, compact = false }) {
  const title = video.title || 'Ohne Titel';
  const date = formatDate(video.createdAt || video.created_at);
  const category = categoryLabel(video.category);
  const views = video.views ?? 0;
  const isLive = !!video.isLive;
  const isPreparing = video.transcode_status === 'pending' || video.transcode_status === 'processing';
  const match = matchLabel(video);
  // Kennzeichnung für die spaetere Paywall — noch ohne Wirkung.
  const gesperrt = video.access_level && video.access_level !== 'public';

  return (
    <article className={`b-card-article${compact ? ' b-card-article--compact' : ''}`}>
      <button
        type="button"
        className="b-card-article__link"
        onClick={() => onSelectVideo?.(video)}
      >
        <div className="b-card-article__media">
          <Media
            src={video.thumbnailUrl || video.thumbnail_url}
            alt=""
            ratio="p-16x9"
            fallback={isLive ? 'Live' : '1848TV'}
          />
          {isLive ? (
            <span className="b-badge b-badge--live">Live</span>
          ) : (
            video.duration > 0 && (
              <span className="b-badge b-badge--duration">{formatDuration(video.duration)}</span>
            )
          )}
          {isPreparing && (
            <span className="b-badge b-badge--prepare">Wird aufbereitet</span>
          )}
          {video.visibility === 'internal' && (
            <span className="b-badge b-badge--internal">Intern</span>
          )}
          {gesperrt && (
            <span className="b-badge b-badge--locked" title={accessLabel(video.access_level)}>
              <Icon name="lock" size={12} />
              {accessLabel(video.access_level)}
            </span>
          )}
        </div>

        <div className="b-card-article__content">
          <h3 className="b-card-article__title b-truncate">{title}</h3>
          <div className="b-meta-line">
            {date && <span className="b-meta-line__item">{date}</span>}
            <span className="b-meta-line__item">{category}</span>
            {!isLive && !compact && <span className="b-meta-line__item">{formatViews(views)}</span>}
          </div>

          {/* Nur wenn das Video wirklich zu einem Spiel gehört. */}
          {match && <div className="b-meta-line__item">{match}</div>}
        </div>
      </button>

      {onDeleteVideo && (
        <button
          type="button"
          className="b-card-article__delete"
          onClick={(e) => { e.stopPropagation(); onDeleteVideo(video.id); }}
        >
          Löschen
        </button>
      )}
    </article>
  );
}
