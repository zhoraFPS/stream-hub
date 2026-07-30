import React from 'react';
import { PlaySquare, Search, Upload, Wifi, QrCode } from 'lucide-react';

export default function Navbar({ search, setSearch, onOpenUpload, onOpenQR }) {
  const currentHost = window.location.hostname || 'localhost';
  const currentPort = window.location.port || '5000';
  const displayAddress = `${currentHost}:${currentPort}`;

  return (
    <header className="sticky-nav px-4 py-3">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Minimalist Logo */}
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-9 h-9 rounded-md bg-[#0055b8] flex items-center justify-center text-white font-bold shadow-md">
            <PlaySquare className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-wider text-white uppercase">
                StreamHub
              </span>
              <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                PROXMOX
              </span>
            </div>
          </div>
        </div>

        {/* Minimalist Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mediathek durchsuchen..."
              className="input-search"
            />
          </div>
        </div>

        {/* Action Controls & DHCP Aware IP Badge */}
        <div className="flex items-center gap-2">
          
          <button
            onClick={onOpenQR}
            title="Klicken für QR-Code & Netzwerk-Details"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-medium hover:bg-blue-500/20 transition-all cursor-pointer"
          >
            <Wifi className="w-3.5 h-3.5 animate-pulse text-blue-400" />
            <span className="hidden sm:inline">{displayAddress}</span>
            <QrCode className="w-3.5 h-3.5 opacity-80" />
          </button>

          <button
            onClick={onOpenUpload}
            className="btn-primary text-xs"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">VOD Hochladen</span>
          </button>
        </div>

      </div>
    </header>
  );
}
