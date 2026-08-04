import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import VideoCard from './components/VideoCard';
import SectionTitle from './components/ui/SectionTitle';
import Chips from './components/ui/Chips';
import Reveal from './components/ui/Reveal';
import Icon from './components/ui/Icon';
import { CATEGORIES, CATEGORY_FILTERS, categoryLabel } from './constants/categories';

/** Videos ohne Wettbewerbsangabe landen gesammelt am Ende. */
const OHNE_WETTBEWERB = 'Weitere Videos';

/**
 * Alles, was nicht zur Startseite gehört, wird erst beim Aufruf geladen.
 * Der Player zieht Plyr nach, das Live-Bild hls.js, das Netzwerk-Fenster
 * den QR-Code-Generator — zusammen der Großteil des früheren Bundles.
 */
const VideoPlayer     = lazy(() => import('./components/VideoPlayer'));
const LivePlayer      = lazy(() => import('./components/LivePlayer'));
const LiveStudioPage  = lazy(() => import('./components/LiveStudioPage'));
const UploadModal     = lazy(() => import('./components/UploadModal'));
const QRCodeModal     = lazy(() => import('./components/QRCodeModal'));
const AuthPage        = lazy(() => import('./components/AuthPage'));
const ChannelPage     = lazy(() => import('./components/ChannelPage'));
const SettingsPage    = lazy(() => import('./components/SettingsPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
      <div className="b-spinner" />
      <span className="b-visually-hidden">Wird geladen</span>
    </div>
  );
}

export default function App() {
  // ── Seitenzustand ───────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState('home'); // home|watch|live|studio|auth|channel|settings
  const [channelUsername, setChannelUsername] = useState(null);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('streamhub_token'));
  const [currentUser, setCurrentUser] = useState(null);

  // ── Inhalte ─────────────────────────────────────────────────────────────────
  const [videos, setVideos] = useState([]);
  const [liveChannels, setLiveChannels] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');   // was im Feld steht
  const [searchTerm, setSearchTerm] = useState('');     // wonach tatsächlich gesucht wird
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeLive, setActiveLive] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Archiv ──────────────────────────────────────────────────────────────────
  const [taxonomy, setTaxonomy] = useState(null);
  const [archiveSeason, setArchiveSeason] = useState(null);
  const [archiveVideos, setArchiveVideos] = useState([]);

  // ── Modale ──────────────────────────────────────────────────────────────────
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);

  // ── Auth-Helfer ─────────────────────────────────────────────────────────────
  const authHeaders = useCallback(() =>
    authToken ? { Authorization: `Bearer ${authToken}` } : {}, [authToken]);

  const handleAuth = (token, user) => {
    localStorage.setItem('streamhub_token', token);
    setAuthToken(token);
    setCurrentUser(user);
    setCurrentPage('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('streamhub_token');
    // Das Medien-Cookie ist httpOnly und lässt sich nur serverseitig löschen.
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentPage('home');
  };

  useEffect(() => {
    if (!authToken) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.ok ? r.json() : null)
      .then(user => { if (user) setCurrentUser(user); else handleLogout(); })
      .catch(() => {});
  }, [authToken]);

  // ── Daten ───────────────────────────────────────────────────────────────────
  const fetchVideos = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const url = new URL('/api/videos', window.location.origin);
      if (selectedCategory && selectedCategory !== 'All') url.searchParams.append('category', selectedCategory);
      if (searchTerm) url.searchParams.append('search', searchTerm);
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error('Videos konnten nicht geladen werden.');
      setVideos(await res.json());
      setError(null);
    } catch (err) {
      if (!quiet) setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [selectedCategory, searchTerm, authHeaders]);

  const fetchTaxonomy = useCallback(async () => {
    try {
      const res = await fetch('/api/taxonomy', { headers: authHeaders() });
      if (res.ok) setTaxonomy(await res.json());
    } catch {}
  }, [authHeaders]);

  const fetchLiveChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/live');
      if (res.ok) setLiveChannels(await res.json());
    } catch {}
    try {
      const res = await fetch('/api/live/status');
      if (res.ok) {
        const data = await res.json();
        setActiveLive(data.active ? data.stream : null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetch('/api/system/info')
      .then(res => res.ok ? res.json() : null)
      .then(info => { if (info) setSystemInfo(info); })
      .catch(() => {});
  }, []);

  // Tippen soll nicht jede Taste einzeln an den Server schicken.
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(searchQuery.trim()), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  useEffect(() => { fetchVideos(); }, [selectedCategory, searchTerm]);

  // Der Live-Status hängt nicht am Filter — einmal beim Start, danach per Ereignis.
  useEffect(() => { fetchLiveChannels(); }, []);

  useEffect(() => { fetchTaxonomy(); }, [fetchTaxonomy]);

  // Erste vorhandene Saison vorwählen, sobald bekannt ist, welche es gibt.
  useEffect(() => {
    if (archiveSeason || !taxonomy?.seasons?.length) return;
    setArchiveSeason(taxonomy.seasons[0].value);
  }, [taxonomy, archiveSeason]);

  useEffect(() => {
    if (!archiveSeason) { setArchiveVideos([]); return; }
    let abgebrochen = false;
    const url = new URL('/api/videos', window.location.origin);
    url.searchParams.set('season', archiveSeason);
    url.searchParams.set('limit', '200');
    fetch(url, { headers: authHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (!abgebrochen) setArchiveVideos(data); })
      .catch(() => {});
    return () => { abgebrochen = true; };
  }, [archiveSeason, authHeaders, videos]);

  // Die Abrufer hängen an Kategorie und Suchbegriff. Über eine Ref bleibt der
  // Ereignisstrom davon unberührt und verbindet sich nicht bei jedem Tastendruck neu.
  const refreshRef = useRef({ fetchVideos, fetchLiveChannels, fetchTaxonomy });
  useEffect(() => {
    refreshRef.current = { fetchVideos, fetchLiveChannels, fetchTaxonomy };
  }, [fetchVideos, fetchLiveChannels, fetchTaxonomy]);

  const [feedConnected, setFeedConnected] = useState(false);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return undefined;

    const source = new EventSource('/api/events');
    source.onopen = () => setFeedConnected(true);
    source.onerror = () => setFeedConnected(false); // EventSource verbindet selbst neu
    source.addEventListener('videos', () => {
      refreshRef.current.fetchVideos(true);
      refreshRef.current.fetchTaxonomy();
    });
    source.addEventListener('live', () => refreshRef.current.fetchLiveChannels());

    return () => { source.close(); setFeedConnected(false); };
  }, []);

  // Sicherheitsnetz: nur solange der Ereignisstrom nicht steht.
  useEffect(() => {
    if (feedConnected) return undefined;
    const interval = setInterval(() => {
      refreshRef.current.fetchVideos(true);
      refreshRef.current.fetchLiveChannels();
    }, 15000);
    return () => clearInterval(interval);
  }, [feedConnected]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goHome = () => {
    setCurrentPage('home');
    setActiveVideo(null);
    if (window.location.hash) window.location.hash = '';
  };

  const openVideo = (video) => {
    if (video.isLive) {
      if (video.username) openChannel(video.username);
      else {
        setActiveLive(video);
        setCurrentPage('live');
        window.location.hash = '#live';
      }
    } else {
      setActiveVideo(video);
      setCurrentPage('watch');
      window.scrollTo({ top: 0 });
      if (video.id) window.location.hash = `#watch=${video.id}`;
    }
  };

  const openChannel = (username) => {
    if (!username) return;
    setChannelUsername(username);
    setCurrentPage('channel');
    window.location.hash = `#channel=${username}`;
  };

  const openStudio = () => { setCurrentPage('studio'); window.location.hash = '#studio'; };
  const openSettings = () => { setCurrentPage('settings'); window.location.hash = '#settings'; };
  const openLive = () => {
    const channel = liveChannels[0];
    if (channel?.username) openChannel(channel.username);
    else { setCurrentPage('live'); window.location.hash = '#live'; }
  };

  useEffect(() => {
    const handleHash = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#channel=')) {
        const uname = hash.replace('#channel=', '');
        if (uname) { setChannelUsername(uname); setCurrentPage('channel'); }
      } else if (hash === '#studio') setCurrentPage('studio');
      else if (hash === '#settings') setCurrentPage('settings');
      else if (hash === '#auth') setCurrentPage('auth');
      else if (hash === '#live') setCurrentPage('live');
      else if (hash.startsWith('#watch=')) {
        const vidId = hash.replace('#watch=', '');
        if (vidId) {
          setCurrentPage('watch');
          try {
            const res = await fetch(`/api/videos/${vidId}`);
            if (res.ok) setActiveVideo(await res.json());
          } catch {}
        }
      } else if (!hash) setCurrentPage('home');
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleDeleteVideo = async (videoId) => {
    if (!authToken) return;
    await fetch(`/api/videos/${videoId}`, { method: 'DELETE', headers: authHeaders() });
    fetchVideos(true);
  };

  const handleUploadComplete = () => {
    setIsUploadOpen(false);
    setTimeout(() => fetchVideos(true), 500);
  };

  const isLiveActive = !!activeLive || liveChannels.length > 0;
  const isFiltered = selectedCategory !== 'All' || !!searchTerm;

  const featuredLiveChannel = liveChannels[0] || (activeLive?.username ? activeLive : null);
  const featuredVideo = !isFiltered ? videos[0] : null;

  /** Bei „Alle" gruppieren wir wie 1848TV in Reihen pro Kategorie. */
  const lanes = useMemo(() => {
    if (isFiltered) return [];
    return CATEGORIES
      .map(cat => ({ ...cat, items: videos.filter(v => v.category === cat.value) }))
      .filter(lane => lane.items.length > 0);
  }, [videos, isFiltered]);

  /** Videos der gewählten Saison nach Wettbewerb gebündelt. */
  const archiveGroups = useMemo(() => {
    if (!archiveVideos.length) return [];
    const buckets = new Map();
    archiveVideos.forEach(video => {
      const key = video.competition || OHNE_WETTBEWERB;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(video);
    });
    // Echte Wettbewerbe zuerst, der Sammelposten ans Ende.
    return [...buckets.entries()]
      .sort(([a], [b]) => (a === OHNE_WETTBEWERB) - (b === OHNE_WETTBEWERB) || a.localeCompare(b, 'de'))
      .map(([competition, items]) => ({ competition, items }));
  }, [archiveVideos]);

  const uncategorised = useMemo(() => {
    if (isFiltered) return [];
    const known = new Set(CATEGORIES.map(c => c.value));
    return videos.filter(v => !known.has(v.category));
  }, [videos, isFiltered]);

  const navProps = {
    search: searchQuery, setSearch: setSearchQuery,
    onOpenUpload: authToken ? () => setIsUploadOpen(true) : () => setCurrentPage('auth'),
    onOpenQR: () => setIsQROpen(true),
    systemInfo, isLive: isLiveActive,
    currentUser, authToken,
    onLogin: () => setCurrentPage('auth'),
    onLogout: handleLogout,
    onOpenChannel: () => openChannel(currentUser?.username),
    onOpenSettings: openSettings,
    onOpenStudio: openStudio,
    onOpenLive: openLive,
    onHome: goHome,
  };

  const modals = (
    <Suspense fallback={null}>
      {isUploadOpen && (
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUploadComplete={handleUploadComplete}
          systemInfo={systemInfo}
          authToken={authToken}
        />
      )}
      {isQROpen && <QRCodeModal isOpen onClose={() => setIsQROpen(false)} systemInfo={systemInfo} />}
    </Suspense>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Unterseiten
  // ══════════════════════════════════════════════════════════════════════════

  if (currentPage === 'auth') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <AuthPage onAuth={handleAuth} onBack={goHome} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (currentPage === 'live' && activeLive) {
    return (
      <ErrorBoundary>
        <Navbar {...navProps} activePage="live" />
        <div className="b-page b-page--wide">
          <Suspense fallback={<PageLoader />}>
            <LivePlayer liveStreamInfo={activeLive} onBack={goHome} />
          </Suspense>
        </div>
      </ErrorBoundary>
    );
  }

  if (currentPage === 'watch' && activeVideo) {
    return (
      <ErrorBoundary>
        <Navbar {...navProps} />
        <div className="b-page b-page--wide">
          <Suspense fallback={<PageLoader />}>
            <VideoPlayer
              video={activeVideo}
              allVideos={videos}
              onSelectVideo={openVideo}
              onOpenChannel={openChannel}
              onBack={goHome}
              systemInfo={systemInfo}
              authToken={authToken}
            />
          </Suspense>
        </div>
      </ErrorBoundary>
    );
  }

  if (currentPage === 'studio') {
    return (
      <ErrorBoundary>
        <Navbar {...navProps} activePage="studio" />
        <div className="b-page b-page--wide">
          <Suspense fallback={<PageLoader />}>
            <LiveStudioPage
              onBack={goHome}
              systemInfo={systemInfo}
              authToken={authToken}
              currentUser={currentUser}
            />
          </Suspense>
        </div>
      </ErrorBoundary>
    );
  }

  if (currentPage === 'channel' && channelUsername) {
    return (
      <ErrorBoundary>
        <Navbar {...navProps} />
        <div className="b-page b-page--wide">
          <Suspense fallback={<PageLoader />}>
            <ChannelPage
              username={channelUsername}
              currentUser={currentUser}
              authToken={authToken}
              onBack={goHome}
              onSelectVideo={openVideo}
            />
          </Suspense>
        </div>
        {modals}
      </ErrorBoundary>
    );
  }

  if (currentPage === 'settings' && currentUser) {
    return (
      <ErrorBoundary>
        <Navbar {...navProps} />
        <div className="b-page">
          <Suspense fallback={<PageLoader />}>
            <SettingsPage
              currentUser={currentUser}
              authToken={authToken}
              onBack={goHome}
              onUserUpdate={setCurrentUser}
            />
          </Suspense>
        </div>
      </ErrorBoundary>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Startseite
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <ErrorBoundary>
      <Navbar {...navProps} variant="overlay" activePage="home" />

      <Hero
        liveChannel={featuredLiveChannel}
        video={featuredVideo}
        onOpenChannel={openChannel}
        onSelectVideo={openVideo}
      />

      <div className="b-page b-page--wide" style={{ paddingBlockStart: 'var(--space-xl)' }}>

        {/* Weitere Live-Kanäle */}
        {liveChannels.length > 1 && (
          <Reveal as="section" className="b-section b-section--compact">
            <SectionTitle title="Weitere Live-Kanäle" count={liveChannels.length - 1} />
            <div className="b-lane">
              {liveChannels.slice(1).map(ch => (
                <VideoCard
                  key={ch.id}
                  video={{
                    id: ch.id,
                    title: ch.live_title || 'VfL Bochum 1848 — Live',
                    isLive: true,
                    username: ch.username,
                    category: 'Spiele',
                  }}
                  onSelectVideo={() => openChannel(ch.username)}
                />
              ))}
            </div>
          </Reveal>
        )}

        {/* Mediathek */}
        <Reveal as="section" className="b-section">
          <SectionTitle
            title={isFiltered ? (searchTerm ? 'Suchergebnisse' : categoryLabel(selectedCategory)) : 'Neueste Videos'}
            count={isFiltered && !loading ? videos.length : null}
            action={isFiltered ? { label: 'Filter zurücksetzen', onClick: () => { setSelectedCategory('All'); setSearchQuery(''); setSearchTerm(''); } } : null}
          >
            <Chips
              items={CATEGORY_FILTERS}
              value={selectedCategory}
              onChange={setSelectedCategory}
            />
          </SectionTitle>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
              <div className="b-spinner" />
            </div>
          ) : error ? (
            <div className="b-notice b-notice--error">{error}</div>
          ) : videos.length === 0 ? (
            <EmptyState authToken={authToken} search={searchTerm} onLogin={() => setCurrentPage('auth')} />
          ) : isFiltered ? (
            <div className="b-grid">
              {videos.map(video => (
                <VideoCard
                  key={video.id}
                  video={toCardVideo(video)}
                  onSelectVideo={openVideo}
                  onDeleteVideo={canDelete(video, currentUser) ? handleDeleteVideo : null}
                />
              ))}
            </div>
          ) : (
            <div className="b-lane">
              {videos.slice(featuredVideo ? 1 : 0, featuredVideo ? 13 : 12).map(video => (
                <VideoCard
                  key={video.id}
                  video={toCardVideo(video)}
                  onSelectVideo={openVideo}
                  onDeleteVideo={canDelete(video, currentUser) ? handleDeleteVideo : null}
                />
              ))}
            </div>
          )}
        </Reveal>

        {/* Reihen pro Kategorie — nur ungefiltert */}
        {!loading && !error && lanes.map(lane => (
          <Reveal as="section" key={lane.value} className="b-section">
            <SectionTitle
              title={lane.label}
              count={lane.items.length}
              action={{ label: 'Alle ansehen', onClick: () => setSelectedCategory(lane.value) }}
            />
            <div className="b-lane">
              {lane.items.map(video => (
                <VideoCard
                  key={video.id}
                  video={toCardVideo(video)}
                  onSelectVideo={openVideo}
                  onDeleteVideo={canDelete(video, currentUser) ? handleDeleteVideo : null}
                />
              ))}
            </div>
          </Reveal>
        ))}

        {!loading && uncategorised.length > 0 && (
          <Reveal as="section" className="b-section">
            <SectionTitle title="Sonstiges" count={uncategorised.length} />
            <div className="b-lane">
              {uncategorised.map(video => (
                <VideoCard
                  key={video.id}
                  video={toCardVideo(video)}
                  onSelectVideo={openVideo}
                  onDeleteVideo={canDelete(video, currentUser) ? handleDeleteVideo : null}
                />
              ))}
            </div>
          </Reveal>
        )}

        {/* Archiv nach Saison und Wettbewerb */}
        {!isFiltered && taxonomy?.seasons?.length > 0 && (
          <Reveal as="section" className="b-section">
            <SectionTitle title="Archiv">
              <Chips
                items={taxonomy.seasons.map(s => ({ value: s.value, label: `${s.value} (${s.count})` }))}
                value={archiveSeason}
                onChange={setArchiveSeason}
              />
            </SectionTitle>

            {archiveGroups.length === 0 ? (
              <p className="b-copy">Für diese Saison liegt noch nichts vor.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-l)' }}>
                {archiveGroups.map(group => (
                  <div key={group.competition}>
                    <div className="b-kicker" style={{ marginBottom: 'var(--space-2xs)' }}>
                      {group.competition}
                      <span style={{ opacity: .5 }}> · {group.items.length}</span>
                    </div>
                    <div className="b-lane">
                      {group.items.map(video => (
                        <VideoCard
                          key={video.id}
                          video={toCardVideo(video)}
                          onSelectVideo={openVideo}
                          onDeleteVideo={canDelete(video, currentUser) ? handleDeleteVideo : null}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Reveal>
        )}

        {/* Redaktions-Einstieg */}
        {!authToken && (
          <Reveal as="section" className="b-section b-section--compact">
            <div className="b-panel b-panel--l" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-s)' }}>
              <div style={{ flex: '1 1 320px' }}>
                <div className="b-kicker" style={{ marginBottom: 'var(--space-3xs)' }}>Für die Redaktion</div>
                <h2 className="b-heading b-heading--500">Videos hochladen und live gehen</h2>
                <p className="b-copy" style={{ marginTop: 'var(--space-3xs)' }}>
                  Melde dich an, um Testspiele zu streamen, Interviews zu veröffentlichen und die Mediathek zu pflegen.
                </p>
              </div>
              <button className="b-button b-button--primary" onClick={() => setCurrentPage('auth')}>
                Anmelden
                <Icon name="arrow-right" size={20} />
              </button>
            </div>
          </Reveal>
        )}
      </div>

      <Marquee />
      {modals}
    </ErrorBoundary>
  );
}

// ── Helfer ────────────────────────────────────────────────────────────────────

function toCardVideo(video) {
  return {
    ...video,
    videoUrl: `/api/videos/${video.id}/stream`,
    thumbnailUrl: video.thumbnail_url || video.thumbnailUrl,
  };
}

function canDelete(video, currentUser) {
  return !!currentUser && video.user_id === currentUser.id;
}

// ── Hero ──────────────────────────────────────────────────────────────────────

/**
 * Der Hero zeigt, was gerade zählt: läuft ein Stream, gehört ihm die Fläche.
 * Sonst steht das neueste Video vorne. Ist die Mediathek leer, erklärt der
 * Hero, was das Portal ist.
 */
function Hero({ liveChannel, video, onOpenChannel, onSelectVideo }) {
  if (liveChannel) {
    const title = liveChannel.live_title || liveChannel.title || 'VfL Bochum 1848 — Live';
    const name = liveChannel.display_name || liveChannel.username;
    return (
      <section className="b-hero">
        <div className="b-hero__media" aria-hidden="true">
          <img src="/bg-figma.jpg" alt="" />
        </div>
        <div className="b-hero__scrim" aria-hidden="true" />
        <div className="b-hero__content">
          <div className="b-row">
            <span className="b-badge b-badge--live b-badge--static">Live</span>
            <span className="b-kicker">{name}</span>
          </div>
          <h1 className="b-heading b-heading--800">{title}</h1>
          <div className="b-row">
            <button
              className="b-button b-button--primary"
              onClick={() => liveChannel.username ? onOpenChannel(liveChannel.username) : onSelectVideo(liveChannel)}
            >
              Stream ansehen
              <Icon name="arrow-right" size={20} />
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (video) {
    return (
      <section className="b-hero">
        <div className="b-hero__media" aria-hidden="true">
          <img src={video.thumbnail_url || video.thumbnailUrl || '/bg-figma.jpg'} alt="" />
        </div>
        <div className="b-hero__scrim" aria-hidden="true" />
        <div className="b-hero__content">
          <span className="b-kicker">Neu · {categoryLabel(video.category)}</span>
          <h1 className="b-heading b-heading--800">{video.title}</h1>
          <div className="b-row">
            <button className="b-button b-button--primary" onClick={() => onSelectVideo(toCardVideo(video))}>
              Video ansehen
              <Icon name="arrow-right" size={20} />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="b-hero">
      <div className="b-hero__media" aria-hidden="true">
        <img src="/bg-figma.jpg" alt="" />
      </div>
      <div className="b-hero__scrim" aria-hidden="true" />
      <div className="b-hero__content">
        <span className="b-kicker">VfL Bochum 1848</span>
        <h1 className="b-heading b-heading--800">Unser Fußball.<br />Unsere Bilder.</h1>
        <p className="b-copy b-copy--body b-copy--front">
          Testspiele live, Pressekonferenzen in voller Länge, Interviews und Behind the Scenes —
          gesammelt an einem Ort.
        </p>
      </div>
    </section>
  );
}

// ── Leerzustand ───────────────────────────────────────────────────────────────

function EmptyState({ authToken, search, onLogin }) {
  if (search) {
    return (
      <div className="b-empty">
        <h3 className="b-heading b-heading--500">Nichts gefunden</h3>
        <p className="b-copy" style={{ margin: 'var(--space-2xs) auto 0' }}>
          Für „{search}" gibt es keine Treffer. Versuch einen kürzeren Suchbegriff.
        </p>
      </div>
    );
  }
  return (
    <div className="b-empty">
      <h3 className="b-heading b-heading--500">Die Mediathek ist noch leer</h3>
      <p className="b-copy" style={{ margin: 'var(--space-2xs) auto var(--space-s)' }}>
        {authToken
          ? 'Lade das erste Video hoch — Testspiel, Interview oder Pressekonferenz.'
          : 'Sobald die Redaktion Videos veröffentlicht, erscheinen sie hier.'}
      </p>
      {!authToken && (
        <button className="b-button b-button--secondary b-button--s" onClick={onLogin}>
          Als Redaktion anmelden
        </button>
      )}
    </div>
  );
}

// ── Wortband ──────────────────────────────────────────────────────────────────

function Marquee() {
  const words = ['Castroper', '1848', 'Ruhrstadion', 'Anne Castroper', '1848', 'Blau-Weiß'];
  const row = [...words, ...words, ...words, ...words];
  return (
    <div className="b-marquee" aria-hidden="true">
      <div className="b-marquee__items" style={{ '--marquee-speed': '48s' }}>
        {row.map((w, i) => <span className="b-marquee__item" key={i}>{w}</span>)}
      </div>
    </div>
  );
}
