import React, { useState, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import VideoCard from './components/VideoCard';
import VideoPlayer from './components/VideoPlayer';
import LivePlayer from './components/LivePlayer';
import LiveStudioPage from './components/LiveStudioPage';
import UploadModal from './components/UploadModal';
import QRCodeModal from './components/QRCodeModal';
import { PlaySquare, Radio, RefreshCw, AlertCircle, Camera, Users, Upload, Play } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [videos, setVideos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVideos = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const url = new URL('/api/videos', window.location.origin);
      if (selectedCategory && selectedCategory !== 'All') url.searchParams.append('category', selectedCategory);
      if (searchQuery) url.searchParams.append('search', searchQuery);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Fehler beim Laden');
      setVideos(await res.json());
      setError(null);
    } catch (err) {
      if (!quiet) setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const fetchLiveStatus = async () => {
    try {
      const res = await fetch('/api/live/status');
      if (res.ok) setLiveStatus(await res.json());
    } catch (e) {}
  };

  const fetchSystemInfo = async () => {
    try {
      const res = await fetch('/api/system/info');
      if (res.ok) setSystemInfo(await res.json());
    } catch (e) {}
  };

  useEffect(() => { fetchSystemInfo(); }, []);
  useEffect(() => { fetchVideos(); fetchLiveStatus(); }, [selectedCategory, searchQuery]);
  useEffect(() => {
    const interval = setInterval(() => { fetchVideos(true); fetchLiveStatus(); }, 4000);
    return () => clearInterval(interval);
  }, [selectedCategory, searchQuery]);

  // Hash-based subpage routing
  useEffect(() => {
    const handleHash = async () => {
      const hash = window.location.hash;
      if (hash === '#studio') setCurrentPage('studio');
      else if (hash === '#live') setCurrentPage('live');
      else if (hash.startsWith('#watch=')) {
        setCurrentPage('watch');
        try {
          const res = await fetch(`/api/videos/${hash.replace('#watch=', '')}`);
          if (res.ok) setActiveVideo(await res.json());
        } catch (e) {}
      } else setCurrentPage('home');
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateTo = (page, video = null) => {
    if (page === 'home') { window.location.hash = ''; setCurrentPage('home'); setActiveVideo(null); fetchVideos(); }
    else if (page === 'studio') { window.location.hash = 'studio'; setCurrentPage('studio'); }
    else if (page === 'live') { window.location.hash = 'live'; setCurrentPage('live'); }
    else if (page === 'watch' && video) { setActiveVideo(video); window.location.hash = `watch=${video.id}`; setCurrentPage('watch'); }
  };

  const handleLikeVideo = async (videoId) => {
    try {
      const res = await fetch(`/api/videos/${videoId}/like`, { method: 'POST' });
      if (res.ok) {
        const { likes } = await res.json();
        if (activeVideo?.id === videoId) setActiveVideo(prev => ({ ...prev, likes }));
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes } : v));
      }
    } catch (e) {}
  };

  const handleAddComment = async (videoId, user, text) => {
    try {
      const res = await fetch(`/api/videos/${videoId}/comment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, text }),
      });
      if (res.ok) {
        const c = await res.json();
        if (activeVideo?.id === videoId) setActiveVideo(prev => ({ ...prev, comments: [c, ...(prev.comments || [])] }));
      }
    } catch (e) {}
  };

  const handleDeleteVideo = async (videoId) => {
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
      if (res.ok) { if (activeVideo?.id === videoId) navigateTo('home'); fetchVideos(); }
    } catch (e) {}
  };

  const isLive = liveStatus?.active;

  return (
    <ErrorBoundary>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#030814', color: '#f8fafc' }}>
        <Navbar
          search={searchQuery}
          setSearch={setSearchQuery}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenQR={() => setIsQROpen(true)}
          systemInfo={systemInfo}
          isLive={isLive}
        />

        {currentPage === 'studio' ? (
          <main style={{ flex: 1 }}>
            <LiveStudioPage
              onBack={() => navigateTo('home')}
              onStreamStarted={fetchLiveStatus}
              onStreamEnded={() => { fetchLiveStatus(); fetchVideos(); }}
            />
          </main>
        ) : currentPage === 'live' ? (
          <main style={{ flex: 1 }}>
            <LivePlayer liveStreamInfo={liveStatus?.stream} onBack={() => navigateTo('home')} />
          </main>
        ) : currentPage === 'watch' && activeVideo ? (
          <main style={{ flex: 1 }}>
            <VideoPlayer
              video={activeVideo} allVideos={videos}
              onSelectVideo={v => navigateTo('watch', v)} onBack={() => navigateTo('home')}
              onLike={handleLikeVideo} onAddComment={handleAddComment} systemInfo={systemInfo}
            />
          </main>
        ) : (
          <div style={{ flex: 1, maxWidth: 1440, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
            
            {/* Live Hero Section - Twitch Style */}
            {isLive ? (
              <div
                onClick={() => navigateTo('live')}
                className="live-hero"
                style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '24px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite', boxShadow: '0 0 8px #ef4444' }}></div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Jetzt Live</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users style={{ width: 14, height: 14 }} />
                      {liveStatus.viewers} Zuschauer
                    </span>
                  </div>

                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                      {liveStatus.stream?.title || 'Live-Stream'}
                    </h2>
                    <p style={{ fontSize: 13, color: '#94a3b8' }}>
                      {liveStatus.stream?.uploader || 'Streamer'} streamt gerade live
                    </p>
                  </div>

                  <button className="btn-primary" style={{ alignSelf: 'flex-start', fontSize: 12 }}>
                    <Play style={{ width: 14, height: 14, fill: '#fff' }} />
                    Live ansehen
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '12px 0' }}>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>StreamHub</h1>
                  <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Lokale VOD Mediathek</p>
                </div>
                <button onClick={() => navigateTo('studio')} className="btn-primary" style={{ fontSize: 12 }}>
                  <Radio style={{ width: 14, height: 14 }} />
                  Live Studio
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, flex: 1 }}>
              <Sidebar selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />

              <main style={{ flex: 1 }}>
                {/* Section Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                    {selectedCategory === 'All' ? 'Alle Aufzeichnungen' : selectedCategory}
                    <span style={{ color: '#475569', fontWeight: 400, marginLeft: 8 }}>({videos.length})</span>
                  </h2>
                  <button onClick={() => fetchVideos()} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 6 }}>
                    <RefreshCw style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 16 }}>
                    {[1, 2, 3].map(n => (
                      <div key={n} style={{ animation: 'pulse 2s infinite' }}>
                        <div style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}></div>
                        <div style={{ height: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 4, marginTop: 12, width: '70%' }}></div>
                        <div style={{ height: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 4, marginTop: 8, width: '40%' }}></div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="empty-state">
                    <AlertCircle style={{ width: 32, height: 32, color: '#ef4444' }} />
                    <p style={{ fontWeight: 600, color: '#fff', marginTop: 8 }}>{error}</p>
                  </div>
                ) : videos.length === 0 ? (
                  <div className="empty-state">
                    <PlaySquare style={{ width: 40, height: 40, color: '#475569' }} />
                    <h3 style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginTop: 12 }}>Keine Aufzeichnungen</h3>
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Lade ein Video hoch oder starte einen Live-Stream.</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button onClick={() => setIsUploadOpen(true)} className="btn-primary" style={{ fontSize: 12 }}>
                        <Upload style={{ width: 14, height: 14 }} />
                        VOD hochladen
                      </button>
                      <button onClick={() => navigateTo('studio')} className="btn-secondary" style={{ fontSize: 12 }}>
                        <Radio style={{ width: 14, height: 14 }} />
                        Live Studio
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 16 }}>
                    {videos.map(video => (
                      <VideoCard
                        key={video.id} video={video}
                        onSelectVideo={v => navigateTo('watch', v)}
                        onDeleteVideo={handleDeleteVideo} systemInfo={systemInfo}
                      />
                    ))}
                  </div>
                )}
              </main>
            </div>
          </div>
        )}

        <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onUploadSuccess={v => navigateTo('watch', v)} />
        <QRCodeModal isOpen={isQROpen} onClose={() => setIsQROpen(false)} systemInfo={systemInfo} />

        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 0', textAlign: 'center', fontSize: 11, color: '#475569', fontFamily: 'var(--font-mono)', marginTop: 'auto' }}>
          StreamHub &middot; Proxmox VE
        </footer>
      </div>
    </ErrorBoundary>
  );
}
