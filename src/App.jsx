import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import VideoCard from './components/VideoCard';
import SectionTitle from './components/ui/SectionTitle';
import Chips from './components/ui/Chips';
import Reveal from './components/ui/Reveal';
import Icon from './components/ui/Icon';
import Footer from './components/Footer';
import CookieNotice from './components/CookieNotice';
import { Impressum, Datenschutz, Nutzungsbedingungen } from './components/LegalPages';
import {
  CATEGORIES, CATEGORY_FILTERS, categoryLabel, categorySlug, categoryFromSlug,
} from './constants/categories';

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
  const navigate = useNavigate();
  const location = useLocation();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('streamhub_token'));
  const [currentUser, setCurrentUser] = useState(null);

  // ── Inhalte ─────────────────────────────────────────────────────────────────
  const [videos, setVideos] = useState([]);
  const [liveChannels, setLiveChannels] = useState([]);
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

  /**
   * Kategorie und Suchbegriff stehen in der Adresszeile, nicht im Zustand.
   * Dadurch lässt sich jede Ansicht teilen und der Zurück-Knopf tut, was er soll.
   */
  const routeCategory = useMemo(() => {
    const match = location.pathname.match(/^\/category\/([^/]+)/);
    return match ? categoryFromSlug(decodeURIComponent(match[1])) : 'All';
  }, [location.pathname]);

  const routeSearch = useMemo(() => {
    if (location.pathname !== '/search') return '';
    return new URLSearchParams(location.search).get('q')?.trim() || '';
  }, [location.pathname, location.search]);

  // ── Auth-Helfer ─────────────────────────────────────────────────────────────
  const authHeaders = useCallback(() =>
    authToken ? { Authorization: `Bearer ${authToken}` } : {}, [authToken]);

  const handleAuth = (token, user) => {
    localStorage.setItem('streamhub_token', token);
    setAuthToken(token);
    setCurrentUser(user);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('streamhub_token');
    // Das Medien-Cookie ist httpOnly und lässt sich nur serverseitig löschen.
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setAuthToken(null);
    setCurrentUser(null);
    navigate('/');
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
      if (routeCategory && routeCategory !== 'All') url.searchParams.append('category', routeCategory);
      if (routeSearch) url.searchParams.append('search', routeSearch);
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error('Videos konnten nicht geladen werden.');
      setVideos(await res.json());
      setError(null);
    } catch (err) {
      if (!quiet) setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [routeCategory, routeSearch, authHeaders]);

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

  useEffect(() => { fetchVideos(); }, [routeCategory, routeSearch, authToken]);

  // Der Live-Status hängt nicht am Filter — einmal beim Start, danach per Ereignis.
  useEffect(() => { fetchLiveChannels(); }, []);
  useEffect(() => { fetchTaxonomy(); }, [fetchTaxonomy]);

  // Erste vorhandene Saison vorwählen, sobald bekannt ist, welche es gibt.
  useEffect(() => {
    if (archiveSeason || !taxonomy?.seasons?.length) return;
    setArchiveSeason(taxonomy.seasons[0].value);
  }, [taxonomy, archiveSeason]);

  useEffect(() => {
    if (!archiveSeason) { setArchiveVideos([]); return undefined; }
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

  // Die Abrufer hängen an Route und Anmeldung. Über eine Ref bleibt der
  // Ereignisstrom davon unberührt und verbindet sich nicht bei jedem Wechsel neu.
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
  const openVideo = (video) => {
    if (video.isLive) {
      navigate(video.username ? `/livestream/${video.username}` : '/livestream');
    } else {
      navigate(`/video/${video.id}`);
    }
  };

  const openChannel = (username) => { if (username) navigate(`/channel/${username}`); };
  const openLive = () => {
    const channel = liveChannels[0];
    navigate(channel?.username ? `/livestream/${channel.username}` : '/livestream');
  };

  const handleDeleteVideo = async (videoId) => {
    if (!authToken) return;
    await fetch(`/api/videos/${videoId}`, { method: 'DELETE', headers: authHeaders() });
    fetchVideos(true);
  };

  const handleUploadComplete = () => {
    setIsUploadOpen(false);
    setTimeout(() => fetchVideos(true), 500);
  };

  const mayPublish = currentUser?.role === 'editor' || currentUser?.role === 'admin';
  const isLiveActive = !!activeLive || liveChannels.length > 0;

  const featuredLiveChannel = liveChannels[0] || (activeLive?.username ? activeLive : null);

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

  const navProps = {
    onSearch: (q) => navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search'),
    initialSearch: routeSearch,
    onOpenUpload: mayPublish ? () => setIsUploadOpen(true) : () => navigate('/login'),
    onOpenQR: () => setIsQROpen(true),
    systemInfo, isLive: isLiveActive,
    currentUser, authToken,
    onLogin: () => navigate('/login'),
    onLogout: handleLogout,
    onOpenChannel: () => openChannel(currentUser?.username),
    onOpenSettings: () => navigate('/profil'),
    onOpenStudio: () => navigate('/studio'),
    onOpenLive: openLive,
    onHome: () => navigate('/'),
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

  const listProps = {
    videos, loading, error, currentUser, openVideo, handleDeleteVideo,
  };

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={
          <Shell nav={navProps} variant="overlay" activePage="home" modals={modals}>
            <HomePage
              {...listProps}
              liveChannel={featuredLiveChannel}
              liveChannels={liveChannels}
              taxonomy={taxonomy}
              archiveSeason={archiveSeason}
              setArchiveSeason={setArchiveSeason}
              archiveGroups={archiveGroups}
              onOpenChannel={openChannel}
              onLogin={() => navigate('/login')}
              onCategory={(value) => navigate(value === 'All' ? '/' : `/category/${categorySlug(value)}`)}
              authToken={authToken}
            />
          </Shell>
        } />

        <Route path="/category/:slug" element={
          <Shell nav={navProps} modals={modals}>
            <CategoryPage {...listProps} category={routeCategory} onCategory={(value) =>
              navigate(value === 'All' ? '/' : `/category/${categorySlug(value)}`)} />
          </Shell>
        } />

        <Route path="/search" element={
          <Shell nav={navProps} modals={modals}>
            <SearchPage {...listProps} term={routeSearch} />
          </Shell>
        } />

        <Route path="/video/:id" element={
          <Shell nav={navProps} modals={modals}>
            <Suspense fallback={<PageLoader />}>
              <VideoRoute
                allVideos={videos}
                onSelectVideo={openVideo}
                onOpenChannel={openChannel}
                authToken={authToken}
                authHeaders={authHeaders}
                currentUser={currentUser}
                onVideoUpdated={() => fetchVideos(true)}
              />
            </Suspense>
          </Shell>
        } />

        <Route path="/livestream/:username?" element={
          <Shell nav={navProps} activePage="live" modals={modals}>
            <Suspense fallback={<PageLoader />}>
              <LiveRoute liveChannels={liveChannels} activeLive={activeLive} onBack={() => navigate('/')} />
            </Suspense>
          </Shell>
        } />

        <Route path="/channel/:username" element={
          <Shell nav={navProps} modals={modals}>
            <Suspense fallback={<PageLoader />}>
              <ChannelRoute
                currentUser={currentUser}
                authToken={authToken}
                onBack={() => navigate('/')}
                onSelectVideo={openVideo}
              />
            </Suspense>
          </Shell>
        } />

        <Route path="/studio" element={
          mayPublish ? (
            <Shell nav={navProps} activePage="studio">
              <Suspense fallback={<PageLoader />}>
                <LiveStudioPage
                  onBack={() => navigate('/')}
                  systemInfo={systemInfo}
                  authToken={authToken}
                  currentUser={currentUser}
                />
              </Suspense>
            </Shell>
          ) : (
            <Shell nav={navProps}>
              <Denied onBack={() => navigate('/')} />
            </Shell>
          )
        } />

        <Route path="/profil" element={
          currentUser ? (
            <Shell nav={navProps} narrow>
              <Suspense fallback={<PageLoader />}>
                <SettingsPage
                  currentUser={currentUser}
                  authToken={authToken}
                  onBack={() => navigate('/')}
                  onUserUpdate={setCurrentUser}
                />
              </Suspense>
            </Shell>
          ) : <Navigate to="/login" replace />
        } />

        <Route path="/login" element={
          currentUser ? <Navigate to="/" replace /> : (
            <Suspense fallback={<PageLoader />}>
              <AuthPage onAuth={handleAuth} onBack={() => navigate('/')} />
            </Suspense>
          )
        } />

        <Route path="/impressum" element={<Shell nav={navProps} narrow><Impressum /></Shell>} />
        <Route path="/datenschutz" element={<Shell nav={navProps} narrow><Datenschutz /></Shell>} />
        <Route path="/nutzungsbedingungen" element={<Shell nav={navProps} narrow><Nutzungsbedingungen /></Shell>} />

        <Route path="*" element={
          <Shell nav={navProps}>
            <NotFound onBack={() => navigate('/')} />
          </Shell>
        } />
      </Routes>
    </ErrorBoundary>
  );
}

// ── Rahmen ────────────────────────────────────────────────────────────────────

function Shell({ nav, variant, activePage, narrow, modals, children }) {
  return (
    <>
      <Navbar {...nav} variant={variant} activePage={activePage} />
      {variant === 'overlay' ? children : (
        <div className={`b-page ${narrow ? '' : 'b-page--wide'}`}>{children}</div>
      )}
      <Footer />
      <CookieNotice />
      {modals}
    </>
  );
}

// ── Routen mit eigenen Daten ──────────────────────────────────────────────────

/** Holt das Video anhand der Adresse — auch beim direkten Aufruf eines Links. */
function VideoRoute({ allVideos, onSelectVideo, onOpenChannel, authToken, authHeaders, currentUser, onVideoUpdated }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let abgebrochen = false;
    setState('loading');
    fetch(`/api/videos/${id}`, { headers: authHeaders() })
      .then(res => res.ok ? res.json() : Promise.reject(new Error('404')))
      .then(data => { if (!abgebrochen) { setVideo(data); setState('ready'); } })
      .catch(() => { if (!abgebrochen) setState('missing'); });
    return () => { abgebrochen = true; };
  }, [id, authHeaders]);

  if (state === 'loading') return <PageLoader />;
  if (state === 'missing') return <NotFound onBack={() => navigate('/')} what="Video" />;

  return (
    <VideoPlayer
      video={{ ...video, thumbnailUrl: video.thumbnail_url || video.thumbnailUrl }}
      allVideos={allVideos}
      onSelectVideo={onSelectVideo}
      onOpenChannel={onOpenChannel}
      onBack={() => navigate('/')}
      authToken={authToken}
      currentUser={currentUser}
      onVideoUpdated={(neu) => { setVideo(neu); onVideoUpdated?.(neu); }}
    />
  );
}

function LiveRoute({ liveChannels, activeLive, onBack }) {
  const { username } = useParams();
  const channel = username ? liveChannels.find(c => c.username === username) : null;

  const stream = channel ? {
    id: `live-obs-${channel.id}`,
    userId: channel.id,
    username: channel.username,
    stream_key: channel.stream_key,
    title: channel.live_title || `${channel.display_name || channel.username} — Live`,
    uploader: channel.display_name || channel.username,
    isLive: true,
  } : activeLive;

  if (!stream) {
    return (
      <div className="b-empty">
        <h1 className="b-heading b-heading--500">Gerade läuft kein Stream</h1>
        <p className="b-copy" style={{ margin: 'var(--space-2xs) auto var(--space-s)' }}>
          Sobald der VfL sendet, erscheint der Stream hier und auf der Startseite.
        </p>
        <button className="b-button b-button--secondary b-button--s" onClick={onBack}>
          Zur Mediathek
        </button>
      </div>
    );
  }

  return <LivePlayer liveStreamInfo={stream} onBack={onBack} />;
}

function ChannelRoute({ currentUser, authToken, onBack, onSelectVideo }) {
  const { username } = useParams();
  return (
    <ChannelPage
      username={username}
      currentUser={currentUser}
      authToken={authToken}
      onBack={onBack}
      onSelectVideo={onSelectVideo}
    />
  );
}

// ── Seiten ────────────────────────────────────────────────────────────────────

function VideoGrid({ videos, loading, error, currentUser, openVideo, handleDeleteVideo, empty }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
        <div className="b-spinner" />
      </div>
    );
  }
  if (error) return <div className="b-notice b-notice--error">{error}</div>;
  if (!videos.length) return empty;

  return (
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
  );
}

function CategoryPage({ category, onCategory, ...rest }) {
  if (!category) return <NotFound what="Kategorie" onBack={() => onCategory('All')} />;

  return (
    <section className="b-section">
      <SectionTitle
        title={categoryLabel(category)}
        count={rest.loading ? null : rest.videos.length}
        action={{ label: 'Alle Videos', onClick: () => onCategory('All') }}
      >
        <Chips items={CATEGORY_FILTERS} value={category} onChange={onCategory} />
      </SectionTitle>

      <VideoGrid {...rest} empty={
        <div className="b-empty">
          <h2 className="b-heading b-heading--500">Noch nichts in dieser Kategorie</h2>
          <p className="b-copy" style={{ margin: 'var(--space-2xs) auto 0' }}>
            Sobald die Redaktion hier etwas veröffentlicht, erscheint es an dieser Stelle.
          </p>
        </div>
      } />
    </section>
  );
}

function SearchPage({ term, ...rest }) {
  return (
    <section className="b-section">
      <SectionTitle
        title={term ? 'Suchergebnisse' : 'Suche'}
        count={term && !rest.loading ? rest.videos.length : null}
      />
      {term
        ? <VideoGrid {...rest} empty={
            <div className="b-empty">
              <h2 className="b-heading b-heading--500">Nichts gefunden</h2>
              <p className="b-copy" style={{ margin: 'var(--space-2xs) auto 0' }}>
                Für „{term}" gibt es keine Treffer. Versuch einen kürzeren Suchbegriff.
              </p>
            </div>
          } />
        : <p className="b-copy">Gib oben einen Suchbegriff ein.</p>}
    </section>
  );
}

function HomePage({
  videos, loading, error, currentUser, openVideo, handleDeleteVideo,
  liveChannel, liveChannels, taxonomy, archiveSeason, setArchiveSeason,
  archiveGroups, onOpenChannel, onLogin, onCategory, authToken,
}) {
  const featuredVideo = videos[0];

  const lanes = useMemo(() => CATEGORIES
    .map(cat => ({ ...cat, items: videos.filter(v => v.category === cat.value) }))
    .filter(lane => lane.items.length > 0), [videos]);

  const uncategorised = useMemo(() => {
    const known = new Set(CATEGORIES.map(c => c.value));
    return videos.filter(v => !known.has(v.category));
  }, [videos]);

  // `key` gehört bewusst nicht hier hinein: React verlangt ihn direkt am
  // Element, ein gespreizter key wird stillschweigend ignoriert.
  const cardProps = (video) => ({
    video: toCardVideo(video),
    onSelectVideo: openVideo,
    onDeleteVideo: canDelete(video, currentUser) ? handleDeleteVideo : null,
  });

  return (
    <>
      <Hero
        liveChannel={liveChannel}
        video={featuredVideo}
        onOpenChannel={onOpenChannel}
        onSelectVideo={openVideo}
      />

      <div className="b-page b-page--wide" style={{ paddingBlockStart: 'var(--space-xl)' }}>
        {liveChannels.length > 1 && (
          <Reveal as="section" className="b-section b-section--compact">
            <SectionTitle title="Weitere Live-Kanäle" count={liveChannels.length - 1} />
            <div className="b-lane">
              {liveChannels.slice(1).map(ch => (
                <VideoCard
                  key={ch.id}
                  video={{ id: ch.id, title: ch.live_title || 'VfL Bochum 1848 — Live', isLive: true, username: ch.username, category: 'Spiele' }}
                  onSelectVideo={() => onOpenChannel(ch.username)}
                />
              ))}
            </div>
          </Reveal>
        )}

        <Reveal as="section" className="b-section">
          <SectionTitle title="Neueste Videos">
            <Chips items={CATEGORY_FILTERS} value="All" onChange={onCategory} />
          </SectionTitle>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
              <div className="b-spinner" />
            </div>
          ) : error ? (
            <div className="b-notice b-notice--error">{error}</div>
          ) : videos.length === 0 ? (
            <div className="b-empty">
              <h2 className="b-heading b-heading--500">Die Mediathek ist noch leer</h2>
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
          ) : (
            <div className="b-lane">
              {videos.slice(1, 13).map(video => <VideoCard key={video.id} {...cardProps(video)} />)}
            </div>
          )}
        </Reveal>

        {!loading && !error && lanes.map(lane => (
          <Reveal as="section" key={lane.value} className="b-section">
            <SectionTitle
              title={lane.label}
              count={lane.items.length}
              action={{ label: 'Alle ansehen', onClick: () => onCategory(lane.value) }}
            />
            <div className="b-lane">
              {lane.items.map(video => <VideoCard key={video.id} {...cardProps(video)} />)}
            </div>
          </Reveal>
        ))}

        {!loading && uncategorised.length > 0 && (
          <Reveal as="section" className="b-section">
            <SectionTitle title="Sonstiges" count={uncategorised.length} />
            <div className="b-lane">
              {uncategorised.map(video => <VideoCard key={video.id} {...cardProps(video)} />)}
            </div>
          </Reveal>
        )}

        {taxonomy?.seasons?.length > 0 && (
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
                      {group.items.map(video => <VideoCard key={video.id} {...cardProps(video)} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Reveal>
        )}

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
              <button className="b-button b-button--primary" onClick={onLogin}>
                Anmelden
                <Icon name="arrow-right" size={20} />
              </button>
            </div>
          </Reveal>
        )}
      </div>

      <Marquee />
    </>
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
  if (!currentUser) return false;
  const mayPublish = currentUser.role === 'editor' || currentUser.role === 'admin';
  return mayPublish && video.user_id === currentUser.id;
}

function NotFound({ onBack, what = 'Seite' }) {
  return (
    <div className="b-empty">
      <div className="b-kicker">404</div>
      <h1 className="b-heading b-heading--500" style={{ marginBlock: 'var(--space-2xs)' }}>
        {what} nicht gefunden
      </h1>
      <p className="b-copy" style={{ margin: '0 auto var(--space-s)' }}>
        Der Link führt ins Leere. Vielleicht wurde der Inhalt entfernt oder die Adresse hat sich vertippt.
      </p>
      <button className="b-button b-button--secondary b-button--s" onClick={onBack}>
        Zur Mediathek
      </button>
    </div>
  );
}

function Denied({ onBack }) {
  return (
    <div className="b-empty">
      <h1 className="b-heading b-heading--500">Kein Zugriff</h1>
      <p className="b-copy" style={{ margin: 'var(--space-2xs) auto var(--space-s)' }}>
        Das Live-Studio ist der Redaktion vorbehalten.
      </p>
      <button className="b-button b-button--secondary b-button--s" onClick={onBack}>
        Zur Mediathek
      </button>
    </div>
  );
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
        <div className="b-hero__media" aria-hidden="true"><img src="/bg-figma.jpg" alt="" /></div>
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
            <button className="b-button b-button--primary" onClick={() => onSelectVideo(video)}>
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
      <div className="b-hero__media" aria-hidden="true"><img src="/bg-figma.jpg" alt="" /></div>
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
