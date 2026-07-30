import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import VideoCard from './components/VideoCard';
import VideoPlayer from './components/VideoPlayer';
import UploadModal from './components/UploadModal';
import QRCodeModal from './components/QRCodeModal';
import { PlaySquare, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [videos, setVideos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);
  
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch System Info & Videos
  const fetchVideos = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/videos', window.location.origin);
      if (selectedCategory && selectedCategory !== 'All') {
        url.searchParams.append('category', selectedCategory);
      }
      if (searchQuery) {
        url.searchParams.append('search', searchQuery);
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Fehler beim Laden der Videos');
      const data = await res.json();
      setVideos(data);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const res = await fetch('/api/system/info');
      if (res.ok) {
        const info = await res.json();
        setSystemInfo(info);
      }
    } catch (err) {
      console.log('System info fetch passive fail:', err);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [selectedCategory, searchQuery]);

  // Handle direct hash navigation e.g. /#watch=video-id
  useEffect(() => {
    const handleHash = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#watch=')) {
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
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSelectVideo = async (video) => {
    setActiveVideo(video);
    window.location.hash = `watch=${video.id}`;
    // Fetch updated details & views
    try {
      const res = await fetch(`/api/videos/${video.id}`);
      if (res.ok) {
        const updated = await res.json();
        setActiveVideo(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBackToGrid = () => {
    setActiveVideo(null);
    window.location.hash = '';
    fetchVideos();
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
          setActiveVideo(null);
          window.location.hash = '';
        }
        fetchVideos();
      }
    } catch (err) {
      alert('Fehler beim Löschen');
    }
  };

  const handleUploadSuccess = (newVideo) => {
    fetchVideos();
    handleSelectVideo(newVideo);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0f12] text-gray-100">
      
      {/* Navigation Header */}
      <Navbar
        search={searchQuery}
        setSearch={setSearchQuery}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenQR={() => setIsQROpen(true)}
        systemInfo={systemInfo}
      />

      {/* Main Layout */}
      {activeVideo ? (
        <main className="flex-1">
          <VideoPlayer
            video={activeVideo}
            onBack={handleBackToGrid}
            onLike={handleLikeVideo}
            onAddComment={handleAddComment}
            systemInfo={systemInfo}
          />
        </main>
      ) : (
        <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-4 p-4">
          
          {/* Sidebar */}
          <Sidebar
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />

          {/* Main Content Feed */}
          <main className="flex-1 space-y-6">
            
            {/* Header Hero Banner */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden bg-gradient-to-r from-red-950/40 via-purple-950/20 to-black">
              <div className="max-w-xl space-y-2 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  Ultra Low-Latency Local VOD Platform
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Deine eigene YouTube-Cloud im Heimnetzwerk
                </h1>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Streaming direkt von deinem Intel NUC auf Proxmox. Blitzschnelle Seek-Zeiten ohne Pufferung & unbegrenzter Speicherplatz.
                </p>
              </div>
            </div>

            {/* Video Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{selectedCategory === 'All' ? 'Alle Neuesten VODs' : selectedCategory}</span>
                  <span className="text-xs text-gray-400 font-normal">({videos.length} VODs)</span>
                </h2>
                <button
                  onClick={fetchVideos}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Aktualisieren"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 py-8">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="animate-pulse space-y-3">
                      <div className="bg-white/5 aspect-video rounded-2xl"></div>
                      <div className="h-4 bg-white/5 rounded w-3/4"></div>
                      <div className="h-3 bg-white/5 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-8 text-center glass-panel rounded-2xl space-y-2 border border-red-500/30">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                  <p className="font-semibold text-white">{error}</p>
                  <p className="text-xs text-gray-400">Prüfe, ob der Server auf Port 5000 läuft.</p>
                </div>
              ) : videos.length === 0 ? (
                <div className="p-12 text-center glass-panel rounded-2xl space-y-3">
                  <PlaySquare className="w-12 h-12 text-gray-600 mx-auto" />
                  <h3 className="font-bold text-white text-base">Keine VODs gefunden</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Lade dein erstes Video hoch, um deinen lokalen Streaming-Dienst zu starten!
                  </p>
                  <button onClick={() => setIsUploadOpen(true)} className="btn-primary text-xs mx-auto">
                    Video Hochladen
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {videos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onSelectVideo={handleSelectVideo}
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
        onUploadSuccess={handleUploadSuccess}
      />

      {/* QR Code Network Modal */}
      <QRCodeModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        systemInfo={systemInfo}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 text-center text-xs text-gray-500 mt-auto">
        StreamHub Proxmox Edition • Intel QuickSync QSV Local Network VOD Server
      </footer>

    </div>
  );
}
