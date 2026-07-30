import React from 'react';
import { PlaySquare, Search, Upload, Wifi, QrCode, Radio } from 'lucide-react';

export default function Navbar({ search, setSearch, onOpenUpload, onOpenQR, systemInfo, isLive }) {
  const currentHost = window.location.hostname || 'localhost';
  const currentPort = window.location.port || '5000';
  const displayAddress = `${currentHost}:${currentPort}`;

  return (
    <header className="sticky-nav px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">

        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0" style={{ cursor: 'pointer' }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
            }}
          >
            <PlaySquare size={20} color="#fff" style={{ fill: '#fff' }} />
          </div>
          <span className="font-bold text-white text-lg" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            StreamHub
          </span>
        </div>

        {/* Search — hidden on mobile */}
        <div className="hidden sm:block flex-1 max-w-xl">
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{ color: 'var(--text-dim)', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mediathek durchsuchen..."
              className="input-search"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">

          {/* LIVE indicator */}
          {isLive && (
            <div className="flex items-center gap-2" style={{ marginRight: 4 }}>
              <span className="live-dot" />
              <span className="text-xs font-bold text-red-400" style={{ letterSpacing: '0.06em' }}>
                LIVE
              </span>
            </div>
          )}

          {/* QR / Network */}
          <button onClick={onOpenQR} className="btn-secondary text-xs" title="QR-Code / Netzwerk">
            <Wifi size={14} className="text-blue-400" />
            <span className="hidden sm:inline font-mono">{displayAddress}</span>
            <QrCode size={14} />
          </button>

          {/* Upload */}
          <button onClick={onOpenUpload} className="btn-primary text-xs">
            <Upload size={16} />
            <span className="hidden sm:inline">Hochladen</span>
          </button>

        </div>
      </div>
    </header>
  );
}
