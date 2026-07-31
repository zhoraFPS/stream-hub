import React, { useState, useEffect, useCallback } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import VideoCard from './components/VideoCard';
import VideoPlayer from './components/VideoPlayer';
import LivePlayer from './components/LivePlayer';
import LiveStudioPage from './components/LiveStudioPage';
import UploadModal from './components/UploadModal';
import QRCodeModal from './components/QRCodeModal';
import AuthPage from './components/AuthPage';
import ChannelPage from './components/ChannelPage';
import SettingsPage from './components/SettingsPage';
import { Trophy, Radio, RefreshCw, AlertCircle, Play, LogIn, Tv } from 'lucide-react';

export default function App() {
  // ── Page State ──────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState('home'); // home|watch|live|studio|auth|channel|settings
  const [channelUsername, setChannelUsername] = useState(null);

  // ── Auth State ──────────────────────────────────────────────────────────────
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('streamhub_token'));
  const [currentUser, setCurrentUser] = useState(null);

  // ── Content State ───────────────────────────────────────────────────────────
  const [videos, setVideos] = useState([]);
  const [liveChannels, setLiveChannels] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeLive, setActiveLive] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);

  // ── Auth helpers ────────────────────────────────────────────────────────────
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
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentPage('home');
  };

  // Fetch own profile on load if token exists
  useEffect(() => {
    if (!authToken) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.ok ? r.json() : null)
      .then(user => { if (user) setCurrentUser(user); else handleLogout(); })
      .catch(() => {});
  }, [authToken]);

  // ── Data Fetching ───────────────────────────────────────────────────────────
  const fetchVideos = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const url = new URL('/api/videos', window.location.origin);
      if (selectedCategory && selectedCategory !== 'All') url.searchParams.append('category', selectedCategory);
      if (searchQuery) url.searchParams.append('search', searchQuery);
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error('Fehler beim Laden');
      setVideos(await res.json());
      setError(null);
    } catch (err) {
      if (!quiet) setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [selectedCategory, searchQuery, authHeaders]);

  const fetchLiveChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/live');
      if (res.ok) setLiveChannels(await res.json());
    } catch {}
    try {
      const res = await fetch('/api/live/status');
      if (res.ok) {
        const data = await res.json();
        if (data.active) setActiveLive(data.stream);
        else setActiveLive(null);
      }
    } catch {}
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const res = await fetch('/api/system/info');
      if (res.ok) setSystemInfo(await res.json());
    } catch {}
  };

  useEffect(() => { fetchSystemInfo(); }, []);
  useEffect(() => { fetchVideos(); fetchLiveChannels(); }, [selectedCategory, searchQuery]);
  useEffect(() => {
    const interval = setInterval(() => { fetchVideos(true); fetchLiveChannels(); }, 5000);
    return () => clearInterval(interval);
  }, [fetchVideos, fetchLiveChannels]);

  // ── Navigation & Hash Routing ────────────────────────────────────────────────
  const goHome = () => {
    setCurrentPage('home');
    setActiveVideo(null);
    setActiveLive(null);
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
      if (video.id) window.location.hash = `#watch=${video.id}`;
    }
  };

  const openChannel = (username) => {
    if (!username) return;
    setChannelUsername(username);
    setCurrentPage('channel');
    window.location.hash = `#channel=${username}`;
  };

  useEffect(() => {
    const handleHash = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#channel=')) {
        const uname = hash.replace('#channel=', '');
        if (uname) { setChannelUsername(uname); setCurrentPage('channel'); }
      } else if (hash === '#studio') {
        setCurrentPage('studio');
      } else if (hash === '#settings') {
        setCurrentPage('settings');
      } else if (hash === '#auth') {
        setCurrentPage('auth');
      } else if (hash === '#live') {
        setCurrentPage('live');
      } else if (hash.startsWith('#watch=')) {
        const vidId = hash.replace('#watch=', '');
        if (vidId) {
          setCurrentPage('watch');
          try {
            const res = await fetch(`/api/videos/${vidId}`);
            if (res.ok) setActiveVideo(await res.json());
          } catch {}
        }
      } else if (!hash) {
        setCurrentPage('home');
      }
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

  // ══════════════════════════════════════════════════════════════════════════════
  // PAGES
  // ══════════════════════════════════════════════════════════════════════════════

  if (currentPage === 'auth') {
    return (
      <ErrorBoundary>
        <AuthPage onAuth={handleAuth} />
        <div style={{ position: 'fixed', top: 16, left: 16 }}>
          <button onClick={goHome} className="btn-secondary" style={{ fontSize: 12 }}>← Zurück</button>
        </div>
      </ErrorBoundary>
    );
  }

  if (currentPage === 'live' && activeLive) {
    return (
      <ErrorBoundary>
        <LivePlayer liveStreamInfo={activeLive} onBack={goHome} />
      </ErrorBoundary>
    );
  }

  if (currentPage === 'watch' && activeVideo) {
    return (
      <ErrorBoundary>
        <VideoPlayer
          video={activeVideo}
          onBack={goHome}
          systemInfo={systemInfo}
          authToken={authToken}
        />
      </ErrorBoundary>
    );
  }

  if (currentPage === 'studio') {
    return (
      <ErrorBoundary>
        <LiveStudioPage onBack={goHome} systemInfo={systemInfo} authToken={authToken} currentUser={currentUser} />
      </ErrorBoundary>
    );
  }

  if (currentPage === 'channel' && channelUsername) {
    return (
      <ErrorBoundary>
        <div style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
          <Navbar
            search={searchQuery} setSearch={setSearchQuery}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenQR={() => setIsQROpen(true)}
            systemInfo={systemInfo} isLive={isLiveActive}
            currentUser={currentUser} authToken={authToken}
            onLogin={() => setCurrentPage('auth')}
            onLogout={handleLogout}
            onOpenChannel={() => openChannel(currentUser?.username)}
            onOpenSettings={() => setCurrentPage('settings')}
            onHome={goHome}
          />
          <ChannelPage
            username={channelUsername}
            currentUser={currentUser}
            authToken={authToken}
            onBack={goHome}
            onSelectVideo={openVideo}
          />
        </div>
      </ErrorBoundary>
    );
  }

  if (currentPage === 'settings' && currentUser) {
    return (
      <ErrorBoundary>
        <div style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
          <Navbar
            search={searchQuery} setSearch={setSearchQuery}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenQR={() => setIsQROpen(true)}
            systemInfo={systemInfo} isLive={isLiveActive}
            currentUser={currentUser} authToken={authToken}
            onLogin={() => setCurrentPage('auth')}
            onLogout={handleLogout}
            onOpenChannel={() => openChannel(currentUser?.username)}
            onOpenSettings={() => setCurrentPage('settings')}
            onHome={goHome}
          />
          <SettingsPage
            currentUser={currentUser}
            authToken={authToken}
            onBack={goHome}
            onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // ── HOME PAGE ───────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <div style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
        <Navbar
          search={searchQuery} setSearch={setSearchQuery}
          onOpenUpload={authToken ? () => setIsUploadOpen(true) : () => setCurrentPage('auth')}
          onOpenQR={() => setIsQROpen(true)}
          systemInfo={systemInfo} isLive={isLiveActive}
          currentUser={currentUser} authToken={authToken}
          onLogin={() => setCurrentPage('auth')}
          onLogout={handleLogout}
          onOpenChannel={() => openChannel(currentUser?.username)}
          onOpenSettings={() => setCurrentPage('settings')}
          onHome={goHome}
        />

        <div style={{ display: 'flex', maxWidth: 1600, margin: '0 auto' }}>
          <Sidebar selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />

          <main style={{ flex: 1, padding: '20px 16px 48px', minWidth: 0 }}>

            {/* ── LIVE STREAMS SECTION ────────────────────────────────────── */}
            {(liveChannels.length > 0 || activeLive) && (
              <section style={{ marginBottom: 36 }}>
                <FeaturedLiveHero
                  channel={liveChannels[0] || (activeLive?.username ? activeLive : null)}
                  onOpenChannel={openChannel}
                />
                {liveChannels.length > 1 && (
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>
                      Weitere Live-Kanäle ({liveChannels.length - 1})
                    </h3>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {liveChannels.slice(1).map(ch => (
                        <LiveChannelCard key={ch.id} channel={ch} onClick={() => openChannel(ch.username)} />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── HERO BANNER (kein Live-Stream aktiv) ──────────────────── */}
            {!isLiveActive && videos.length === 0 && !loading && (
              <div style={{
                borderRadius: 16, padding: '32px 28px', marginBottom: 28,
                background: 'linear-gradient(135deg, rgba(0,85,184,0.18) 0%, rgba(0,0,0,0) 100%)',
                border: '1px solid rgba(0,85,184,0.25)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #0055b8, #FFD700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trophy style={{ width: 22, height: 22, color: '#fff' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>VfL Bochum TV</h2>
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Freundschaftsspiele · Interviews · Training · Behind the Scenes</p>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                  Willkommen auf dem offiziellen Streaming-Portal des VfL Bochum. Hier findet ihr Livestreams von Freundschaftsspielen und Testspielen, exklusive Interviews mit Spielern und Staff sowie Trainingseinblicke und vieles mehr.
                </p>
              </div>
            )}

            {/* ── LOGIN PROMPT (nicht eingeloggt) ────────────────────────── */}
            {!authToken && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, background: 'rgba(0,85,184,0.08)', border: '1px solid rgba(0,85,184,0.2)', marginBottom: 28 }}>
                <Tv style={{ width: 20, height: 20, color: '#0055b8', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13, color: '#94a3b8' }}>
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>VfL-Redakteur?</span> Melde dich an um Videos hochzuladen und live zu streamen.
                </div>
                <button onClick={() => setCurrentPage('auth')} className="btn-primary"
                  style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <LogIn style={{ width: 14, height: 14 }} /> Anmelden
                </button>
              </div>
            )}

            {/* ── VIDEO GRID ──────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
                {selectedCategory === 'All' ? 'Alle Videos' : selectedCategory.replace('_', ' ')}
                {!loading && <span style={{ fontSize: 13, color: '#475569', fontWeight: 400, marginLeft: 8 }}>({videos.length})</span>}
              </h2>
              <button onClick={() => fetchVideos()} className="btn-secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw style={{ width: 13, height: 13 }} /> Aktualisieren
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0055b8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <AlertCircle style={{ width: 36, height: 36, color: '#ef4444', margin: '0 auto 12px' }} />
                <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>
              </div>
            ) : videos.length === 0 ? (
              <div className="empty-state">
                <Trophy style={{ width: 48, height: 48, margin: '0 auto 14px', opacity: 0.25 }} />
                <p style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>Noch keine Videos vorhanden</p>
                <p style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>
                  {authToken ? 'Lade das erste VfL-Video hoch!' : 'Schau bald wieder vorbei!'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {videos.map(video => (
                  <VideoCard
                    key={video.id}
                    video={{ ...video, videoUrl: `/api/videos/${video.id}/stream`, thumbnailUrl: video.thumbnail_url || video.thumbnailUrl }}
                    onSelectVideo={openVideo}
                    onDeleteVideo={authToken && (video.user_id === currentUser?.id) ? handleDeleteVideo : null}
                    systemInfo={systemInfo}
                    onOpenChannel={openChannel}
                  />
                ))}
              </div>
            )}
          </main>
        </div>

        {isUploadOpen && (
          <UploadModal
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            onUploadComplete={handleUploadComplete}
            systemInfo={systemInfo}
            authToken={authToken}
          />
        )}
        {isQROpen && <QRCodeModal onClose={() => setIsQROpen(false)} systemInfo={systemInfo} />}
      </div>
    </ErrorBoundary>
  );
}

// ── Live Channel Card ─────────────────────────────────────────────────────────
function LiveChannelCard({ channel, onClick }) {
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', width: 220, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid rgba(220,38,38,0.3)', overflow: 'hidden', transition: 'transform 0.15s, border-color 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#dc2626'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'; }}>
      <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #0a1128 0%, #1e3a5f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,85,184,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Play style={{ width: 18, height: 18, fill: '#fff', color: '#fff', marginLeft: 2 }} />
        </div>
        <div style={{ position: 'absolute', top: 8, left: 8, background: '#dc2626', padding: '2px 7px', borderRadius: 3, fontSize: 10, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
          LIVE
        </div>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {channel.display_name || channel.username}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {channel.live_title || 'VfL Bochum TV Live'}
        </div>
      </div>
    </div>
  );
}

// ── Featured Live Hero ────────────────────────────────────────────────────────
function FeaturedLiveHero({ channel, onOpenChannel }) {
  if (!channel) return null;
  const liveStreamInfo = {
    id: `live-obs-${channel.id || 'legacy'}`,
    userId: channel.id,
    username: channel.username,
    stream_key: channel.stream_key,
    title: channel.live_title || channel.title || `VfL Bochum TV – Live`,
    uploader: channel.display_name || channel.username,
    isLive: true,
  };

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid rgba(220,38,38,0.35)', overflow: 'hidden', marginBottom: 24, padding: 16, boxShadow: '0 8px 32px rgba(220,38,38,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            🔴 VfL Bochum TV – Live
          </span>
        </div>
        {channel.username && (
          <button onClick={() => onOpenChannel(channel.username)} className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
            Kanal ansehen →
          </button>
        )}
      </div>

      <LivePlayer liveStreamInfo={liveStreamInfo} onBack={null} />

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div
          onClick={() => onOpenChannel(channel.username)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          className="hover-opacity"
        >
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #0055b8, #FFD700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
            {channel.avatar_url ? (
              <img src={channel.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (channel.display_name || channel.username || 'V')[0].toUpperCase()
            )}
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
              {channel.live_title || channel.title || 'VfL Bochum TV Live'}
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              {channel.display_name || channel.username}
              {channel.username && <span style={{ color: '#475569' }}> (@{channel.username})</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
