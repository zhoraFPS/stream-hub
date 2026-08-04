import React, { useRef, useState, useEffect } from 'react';
import Plyr from 'plyr';
import VideoCard from './VideoCard';
import EditVideoModal from './EditVideoModal';
import SectionTitle from './ui/SectionTitle';
import Icon from './ui/Icon';
import { formatDate, formatTimeAgo, formatViews } from '../utils/formatters';
import { categoryLabel } from '../constants/categories';
import { allows, subscribeConsent } from '../utils/consent';
import { loadCastSdk, castMedia } from '../utils/cast';

/**
 * Plyr spricht ab Werk Englisch. Auf einer Vereinsseite, die sonst durchgehend
 * deutsch ist, fällt ein „Settings"-Menü sofort auf.
 */
const PLYR_DEUTSCH = {
  restart: 'Neu starten',
  play: 'Abspielen',
  pause: 'Pause',
  seek: 'Suchen',
  seekLabel: '{currentTime} von {duration}',
  played: 'Abgespielt',
  buffered: 'Geladen',
  currentTime: 'Aktuelle Zeit',
  duration: 'Dauer',
  volume: 'Lautstärke',
  mute: 'Stummschalten',
  unmute: 'Ton an',
  enterFullscreen: 'Vollbild',
  exitFullscreen: 'Vollbild beenden',
  frameTitle: 'Player für {title}',
  captions: 'Untertitel',
  settings: 'Einstellungen',
  pip: 'Bild im Bild',
  menuBack: 'Zurück',
  speed: 'Geschwindigkeit',
  normal: 'Normal',
  quality: 'Qualität',
  qualityLabel: { 0: 'Automatisch' },
  reset: 'Zurücksetzen',
  disabled: 'Aus',
  enabled: 'An',
};

export default function VideoPlayer({
  video, allVideos, onSelectVideo, onBack, onOpenChannel, authToken, currentUser, onVideoUpdated,
}) {
  const [bearbeiten, setBearbeiten] = useState(false);

  // Dieselbe Regel wie im Server: die hochladende Person oder die Verwaltung.
  const darfBearbeiten = !!currentUser
    && (currentUser.role === 'editor' || currentUser.role === 'admin')
    && (video.user_id === currentUser.id || currentUser.role === 'admin');

  const videoRef = useRef(null);
  const playerRef = useRef(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likes || 0);
  const [liked, setLiked] = useState(false);

  const uploaderName = video.display_name || video.username || video.uploader || 'VfL Redaktion';
  const uploaderUsername = video.username;

  // Die Originaldatei bleibt der Notnagel: sie funktioniert immer, auch wenn
  // die Aufbereitung noch läuft oder fehlgeschlagen ist.
  const progressiveUrl = video.videoUrl && video.videoUrl.startsWith('http')
    ? video.videoUrl
    : `/api/videos/${video.id}/stream`;

  const hlsSrc = video.transcode_status === 'ready' && video.hls_path
    ? `/uploads/${video.hls_path}`
    : null;

  const isPreparing = video.transcode_status === 'pending' || video.transcode_status === 'processing';

  useEffect(() => {
    setLikeCount(video.likes || 0);
    setLiked(false);
  }, [video.id]);

  // Ein Aufruf ist eine Wiedergabe, kein Seitenaufruf — deshalb erst melden,
  // wenn wirklich Bild läuft, und pro Video nur einmal.
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return undefined;

    let reported = false;
    const report = () => {
      if (reported) return;
      reported = true;
      fetch(`/api/videos/${video.id}/view`, { method: 'POST' }).catch(() => {});
    };

    element.addEventListener('playing', report);
    return () => element.removeEventListener('playing', report);
  }, [video.id]);

  useEffect(() => {
    // Aufbau um einen Frame verzögert: React ruft Effekte im Entwicklungsmodus
    // doppelt auf, und Plyrs destroy() räumt asynchron auf — die zweite Instanz
    // wurde dadurch vom Aufräumen der ersten wieder abgerissen und der Player
    // blieb unsichtbar. Wird vor dem Frame abgebrochen, entsteht gar keine.
    let cancelled = false;
    let player = null;
    let hls = null;

    const frame = requestAnimationFrame(async () => {
      if (cancelled || !videoRef.current) return;
      const element = videoRef.current;

      /** Plyr braucht die Qualitätsstufen beim Erzeugen — nachrüsten geht nicht. */
      const starte = (extras = {}) => {
        if (cancelled) return;
        player = new Plyr(element, {
          autoplay: true,
          controls: ['play-large', 'play', 'progress', 'current-time', 'duration',
                     'mute', 'volume', 'settings', 'pip', 'airplay', 'fullscreen'],
          settings: ['quality', 'speed'],
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
          tooltips: { controls: true, seek: true },
          keyboard: { focused: true, global: true },
          i18n: PLYR_DEUTSCH,
          ...extras,
        });
        playerRef.current = player;
      };

      if (hlsSrc) {
        // hls.js hat Vorrang, wo es laufen kann: manche Chromium-Browser melden
        // native HLS-Unterstützung, spielen es aber unzuverlässig ab. Ohne
        // MediaSource — also auf dem iPhone — kann hls.js ohnehin nichts
        // ausrichten, und die Bibliothek wird dort gar nicht erst geladen.
        const hasMediaSource = typeof window.MediaSource !== 'undefined'
          || typeof window.ManagedMediaSource !== 'undefined';

        if (hasMediaSource) {
          const { default: Hls } = await import('hls.js');
          if (cancelled || !videoRef.current) return;

          if (Hls.isSupported()) {
            hls = new Hls({ enableWorker: true });
            hls.loadSource(hlsSrc);
            hls.attachMedia(element);

            // Erst wenn die Playlist gelesen ist, stehen die Stufen fest.
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              if (cancelled || playerRef.current) return;
              const stufen = hls.levels.map(l => l.height).filter(Boolean);
              const eindeutig = [...new Set(stufen)].sort((a, b) => b - a);

              starte({
                quality: {
                  default: 0,               // 0 steht für die automatische Wahl
                  options: [0, ...eindeutig],
                  forced: true,
                  onChange: (hoehe) => {
                    if (!hls) return;
                    // Ohne Auswahl entscheidet hls.js weiter selbst.
                    if (!hoehe) { hls.currentLevel = -1; return; }
                    const index = hls.levels.findIndex(l => l.height === hoehe);
                    if (index >= 0) hls.currentLevel = index;
                  },
                },
              });
            });
            return;
          }

          if (element.canPlayType('application/vnd.apple.mpegurl')) element.src = hlsSrc;
          else element.src = progressiveUrl;
        } else if (element.canPlayType('application/vnd.apple.mpegurl')) {
          element.src = hlsSrc;   // Safari auf dem iPhone spielt HLS direkt
        } else {
          element.src = progressiveUrl;
        }
      } else {
        element.src = progressiveUrl;
      }

      // Ohne Bitratenleiter gibt es nichts zu wählen — dann kein Qualitätsmenü.
      starte({ settings: ['speed'] });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (hls) { try { hls.destroy(); } catch {} }
      if (player) { try { player.destroy(); } catch {} }
      playerRef.current = null;
    };
  }, [hlsSrc, progressiveUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/video/${video.id}`);
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

  // ── Chromecast ──────────────────────────────────────────────────────────────
  const [castErlaubt, setCastErlaubt] = useState(() => allows('external'));
  const [castBereit, setCastBereit] = useState(false);
  const [castFehler, setCastFehler] = useState('');

  /**
   * Interne Videos lassen sich nicht casten: das Gerät holt sich den Stream
   * selbst und hat unser Medien-Cookie nicht — der Abruf liefe in ein 403 und
   * auf dem Fernseher bliebe es schwarz. Lieber gar nicht erst anbieten.
   */
  const castMoeglich = castBereit && video.visibility !== 'internal';

  useEffect(() => subscribeConsent(() => setCastErlaubt(allows('external'))), []);

  // Erst nach Zustimmung: vorher wird gar nichts von Google geladen.
  useEffect(() => {
    if (!castErlaubt) { setCastBereit(false); return undefined; }
    let abgebrochen = false;
    loadCastSdk().then(ok => { if (!abgebrochen) setCastBereit(ok); });
    return () => { abgebrochen = true; };
  }, [castErlaubt]);

  const casten = async () => {
    setCastFehler('');
    try {
      // Das Gerät holt sich den Stream selbst — die Adresse muss also absolut
      // und aus dem Netz erreichbar sein.
      const quelle = new URL(hlsSrc || progressiveUrl, window.location.origin).href;
      await castMedia({
        url: quelle,
        title: video.title,
        poster: video.thumbnailUrl ? new URL(video.thumbnailUrl, window.location.origin).href : null,
      });
      playerRef.current?.pause?.();
    } catch (err) {
      // Abbruch durch die Nutzerin ist kein Fehler, den man anzeigen muss.
      if (!/cancel/i.test(err?.message || '')) {
        setCastFehler(
          window.location.hostname === 'localhost'
            ? 'Ein Chromecast erreicht „localhost" nicht. Ruf die Seite über die IP-Adresse der NUC auf.'
            : (err.message || 'Übertragung an den Chromecast fehlgeschlagen.')
        );
      }
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
            {/* Die Quelle setzt der Effekt — je nachdem, ob eine aufbereitete
                Fassung vorliegt oder die Originaldatei ausgeliefert wird. */}
            <video ref={videoRef} playsInline controls style={{ width: '100%' }} />
          </div>

          {castFehler && <div className="b-notice b-notice--error">{castFehler}</div>}

          {isPreparing && (
            <div className="b-notice b-notice--info">
              Dieses Video wird gerade aufbereitet. Bis dahin läuft die Originalfassung —
              die passt sich noch nicht an die Verbindung an.
            </div>
          )}

          <div>
            <h1 className="b-heading b-heading--500">{video.title}</h1>
            <div className="b-meta-line" style={{ marginTop: 'var(--space-3xs)' }}>
              <span className="b-meta-line__item">{formatDate(video.createdAt || video.created_at)}</span>
              <span className="b-meta-line__item">{categoryLabel(video.category)}</span>
              <span className="b-meta-line__item">{formatViews(video.views)}</span>
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
              {darfBearbeiten && (
                <button type="button" className="b-button b-button--secondary b-button--s"
                  onClick={() => setBearbeiten(true)}>
                  Bearbeiten
                </button>
              )}
              {authToken && (
                <button type="button" className="b-button b-button--ghost b-button--s"
                  onClick={handleLike} disabled={liked}>
                  Gefällt mir · {likeCount}
                </button>
              )}
              {castMoeglich && (
                <button type="button" className="b-button b-button--ghost b-button--s" onClick={casten}>
                  Auf Fernseher
                </button>
              )}
              <button type="button" className="b-button b-button--ghost b-button--s" onClick={handleCopyLink}>
                {copiedLink ? 'Link kopiert' : 'Teilen'}
              </button>
              {/* Bewusst die Originaldatei: die aufbereitete Fassung besteht
                  aus hunderten Segmenten und lässt sich nicht herunterladen. */}
              <a href={progressiveUrl} download className="b-button b-button--ghost b-button--s">
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

      {bearbeiten && (
        <EditVideoModal
          video={video}
          authToken={authToken}
          onClose={() => setBearbeiten(false)}
          onSaved={onVideoUpdated}
        />
      )}
    </div>
  );
}
