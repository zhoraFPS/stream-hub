import React from 'react';
import { PlaySquare, Search, Upload, Wifi, QrCode, Smartphone } from 'lucide-react';

export default function Navbar({ search, setSearch, onOpenUpload, onOpenQR }) {
  // DHCP-Aware: Get the exact real IP / host from browser window location
  const currentHost = window.location.hostname || 'localhost';
  const currentPort = window.location.port || '5000';
  const displayAddress = `${currentHost}:${currentPort}`;

  return (
    <header className="sticky-nav px-4 py-3 border-b border-white/10">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-9 h-9 rounded-md bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <PlaySquare className="w-5 h-5 fill-blue-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">
                StreamHub
              </span>
              <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                DHCP-Live
              </span>
            </div>
            <p className="text-[11px] text-gray-400 -mt-1 hidden sm:block font-mono">Proxmox NUC Node</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="VODs, Tags oder Themen suchen..."
              className="input-search"
            />
          </div>
        </div>

        {/* Action Controls & DHCP Aware IP Badge */}
        <div className="flex items-center gap-2">
          
          {/* Dynamic DHCP IP Badge */}
          <button
            onClick={onOpenQR}
            title="Klicken für QR-Code & Handy-Stream Link"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium hover:bg-cyan-500/20 transition-all cursor-pointer network-badge"
          >
            <Wifi className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span className="hidden sm:inline">{displayAddress}</span>
            <QrCode className="w-3.5 h-3.5 opacity-80" />
          </button>

          {/* Upload / Smartphone Stream Button */}
          <button
            onClick={onOpenUpload}
            className="btn-primary text-xs shadow-md"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">VOD / Handy-Stream</span>
          </button>
        </div>

      </div>
    </header>
  );
}
