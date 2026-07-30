import React, { useState, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import VideoCard from './components/VideoCard';
import VideoPlayer from './components/VideoPlayer';
import LivePlayer from './components/LivePlayer';
import TikTokLiveStudio from './components/TikTokLiveStudio';
import UploadModal from './components/UploadModal';
import QRCodeModal from './components/QRCodeModal';
import { PlaySquare, Radio, RefreshCw, AlertCircle, Camera, Users } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'watch', 'studio', 'live'
  const [videos, setVideos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);

  // Live Stream state
  const [liveStatus, setLiveStatus] = useState(null);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch System Info, Live Status, and Videos
  const fetchVideos = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const url = new URL('/api/videos', window.location.origin);
      if (selectedCategory && selectedCategory !== 'All') {
        url.searchParams.append('category', selectedCategory);
      }
      if (searchQuery) {
        url.searchParams.append('search', searchQuery);
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Fehler beim Laden der VODs');
      const data = await res.json();
      setVideos(data);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      if (!quiet) setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const fetchLiveStatus = async () => {
    try {
      const res = await fetch('/api/live/status');
      if (res.ok) {
        const data = await res.json();
        setLiveStatus(data);
      }
    } catch (e) {}
  };

  const fetchSystemInfo = async () => {
    try {
      const res = await fetch('/api/system/info');
      if (res.ok) {
        const info = await res.json();
        setSystemInfo(info);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  useEffect(() => {
    fetchVideos();
    fetchLiveStatus();
  }, [selectedCategory, searchQuery]);

  // Live Auto-Refresh polling
  useEffect(() => {
    const interval = setInterval(() => {
      fetchVideos(true);
      fetchLiveStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedCategory, searchQuery]);

  // Subpage Hash Routing: #studio, #live, #watch=id
  useEffect(() => {
    const handleHash = async () => {
      const hash = window.location.hash;
      if (hash === '#studio') {
        setCurrentPage('studio');
      } else if (hash === '#live') {
        setCurrentPage('live');
      } else if (hash.startsWith('#watch=')) {
        setCurrentPage('watch');
        const videoId = hash.replace('#watch=', '');
        try {
          const res = await fetch(`/api/videos/${videoId}`);
          if (res.ok) {
            const v = await res.json();
            setActiveVideo(v);
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        setCurrentPage('home');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateTo = (page, video = null) => {
    if (page === 'home') {
      window.location.hash = '';
      setCurrentPage('home');
      setActiveVideo(null);
      fetchVideos();
    } else if (page === 'studio') {
      window.location.hash = 'studio';
      setCurrentPage('studio');
    } else if (page === 'live') {
      window.location.hash = 'live';
      setCurrentPage('live');
    } else if (page === 'watch' && video) {
      setActiveVideo(video);
      window.location.hash = `watch=${video.id}`;
      setCurrentPage('watch');
    }
  };

  const handleLikeVideo = async (videoId) => {
    try {
      const res = await fetch(`/api/videos/${videoId}/like`, { method: 'POST' });
      if (res.ok) {
        const { likes } = await res.json();
        if (activeVideo && activeVideo.id === videoId) {
          setActiveVideo((prev) => ({ ...prev, likes }));
        }
        setVideos((prev) =>
          prev.map((v) => (v.id === videoId ? { ...v, likes } : v))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (videoId, user, text) => {
    try {
      const res = await fetch(`/api/videos/${videoId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, text }),
      });
      if (res.ok) {
        const newComment = await res.json();
        if (activeVideo && activeVideo.id === videoId) {
          setActiveVideo((prev) => ({
            ...prev,
            comments: [newComment, ...(prev.comments || [])],
          }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
      if (res.ok) {
        if (activeVideo && activeVideo.id === videoId) {
          navigateTo('home');
        }
        fetchVideos();
      }
    } catch (err) {
      alert('Fehler beim Löschen');
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#07090e] text-gray-100">
        
        {/* Navigation Header */}
        <Navbar
          search={searchQuery}
          setSearch={setSearchQuery}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenQR={() => setIsQROpen(true)}
          systemInfo={systemInfo}
        />

        {/* Subpage Router */}
        {currentPage === 'studio' ? (
          <main className="flex-1">
            <TikTokLiveStudio
              onBack={() => navigateTo('home')}
              onStreamStarted={() => fetchLiveStatus()}
              onStreamEnded={() => {
                fetchLiveStatus();
                fetchVideos();
              }}
            />
          </main>
        ) : currentPage === 'live' ? (
          <main className="flex-1">
            <LivePlayer
              liveStreamInfo={liveStatus?.stream}
              onBack={() => navigateTo('home')}
            />
          </main>
        ) : currentPage === 'watch' && activeVideo ? (
          <main className="flex-1">
            <VideoPlayer
              video={activeVideo}
              allVideos={videos}
              onSelectVideo={(v) => navigateTo('watch', v)}
              onBack={() => navigateTo('home')}
              onLike={handleLikeVideo}
              onAddComment={handleAddComment}
              systemInfo={systemInfo}
            />
          </main>
        ) : (
          <div className="flex-1 max-w-[1440px] w-full mx-auto flex flex-col lg:flex-row gap-4 p-4">
            
            {/* Sidebar */}
            <Sidebar
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />

            {/* Main Feed */}
            <main className="flex-1 space-y-5">
              
              {/* Active Live Stream Hero Banner */}
              {liveStatus && liveStatus.active ? (
                <div
                  onClick={() => navigateTo('live')}
                  className="glass-panel p-5 rounded-xl border border-red-500/50 bg-gradient-to-r from-red-950/60 via-black to-red-950/40 cursor-pointer hover:border-red-400 transition-all shadow-xl shadow-red-500/10 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 px-3 py-1 rounded bg-red-600 text-white font-mono text-xs font-bold animate-pulse">
                      <Radio className="w-3.5 h-3.5" />
                      <span>🔴 TIKTOK-STYLE LIVE STREAM AKTIV</span>
                    </div>

                    <span className="text-xs text-gray-300 font-mono flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded border border-white/10">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      {liveStatus.viewers} Zuschauer
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {liveStatus.stream?.title || '🔴 Live-Stream vom Handy'}
                    </h2>
                    <p className="text-xs text-red-300">
                      Klicke hier, um den Live-Kamerastream direkt anzusehen!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="glass-panel p-5 rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-950/30 via-black to-black flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-mono font-semibold border border-blue-500/30">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      Proxmox TikTok-Style Live & OBS Studio Hub
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                      FiveM StreamHub • Live Studio
                    </h1>
                    <p className="text-xs text-gray-300">
                      Streame live mit deinem Smartphone (TikTok-Style) oder verbinde OBS Studio per Stream-Schlüssel.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigateTo('studio')}
                      className="py-2.5 px-4 rounded-md bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 hover:brightness-110 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>🔴 TIKTOK LIVE STUDIO ÖFFNEN</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Video Grid Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{selectedCategory === 'All' ? 'Alle VOD-Aufzeichnungen' : selectedCategory}</span>
                    <span className="text-xs text-gray-500 font-mono font-normal">({videos.length} VODs)</span>
                  </h2>
                  <button
                    onClick={() => fetchVideos()}
                    className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Aktualisieren"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-6">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="animate-pulse space-y-3">
                        <div className="bg-white/5 aspect-video rounded-md"></div>
                        <div className="h-4 bg-white/5 rounded w-3/4"></div>
                        <div className="h-3 bg-white/5 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="p-8 text-center glass-panel space-y-2 border border-red-500/30">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                    <p className="font-semibold text-white">{error}</p>
                  </div>
                ) : videos.length === 0 ? (
                  <div className="p-12 text-center glass-panel space-y-3">
                    <PlaySquare className="w-12 h-12 text-gray-600 mx-auto" />
                    <h3 className="font-bold text-white text-base">Keine VODs vorhanden</h3>
                    <button onClick={() => navigateTo('studio')} className="btn-primary text-xs mx-auto">
                      🔴 Live Studio öffnen
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {videos.map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        onSelectVideo={(v) => navigateTo('watch', v)}
                        onDeleteVideo={handleDeleteVideo}
                        systemInfo={systemInfo}
                      />
                    ))}
                  </div>
                )}
              </div>

            </main>

          </div>
        )}

        {/* Upload Modal */}
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={(v) => navigateTo('watch', v)}
        />

        {/* QR Code Network Modal */}
        <QRCodeModal
          isOpen={isQROpen}
          onClose={() => setIsQROpen(false)}
          systemInfo={systemInfo}
        />

        {/* Footer */}
        <footer className="border-t border-white/5 py-3 text-center text-xs text-gray-500 font-mono mt-auto">
          FiveM StreamHub TikTok Live & OBS Studio Hub • Proxmox VE
        </footer>

      </div>
    </ErrorBoundary>
  );
}
