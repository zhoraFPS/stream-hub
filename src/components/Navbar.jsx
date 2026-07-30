import React, { useState } from 'react';
import { PlaySquare, Search, Upload, Wifi, QrCode, Tv } from 'lucide-react';

export default function Navbar({ search, setSearch, onOpenUpload, onOpenQR, systemInfo }) {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-red-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
            <PlaySquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400">
                StreamHub
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Low Latency
              </span>
            </div>
            <p className="text-[11px] text-gray-400 -mt-1 hidden sm:block">Proxmox Local VOD Server</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl mx-2 sm:mx-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Videos, VODs, Tags oder Themen suchen..."
              className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"
            />
          </div>
        </div>

        {/* Action Controls & Local Network Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Local LAN IP Badge */}
          {systemInfo && (
            <button
              onClick={onOpenQR}
              title="Klicken für QR-Code & Netzwerk-Details"
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-all cursor-pointer network-badge-glow"
            >
              <Wifi className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              <span>{systemInfo.localIp}:{systemInfo.port}</span>
              <QrCode className="w-3.5 h-3.5 ml-1 opacity-80" />
            </button>
          )}

          {/* Mobile QR trigger */}
          <button
            onClick={onOpenQR}
            className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-cyan-400 hover:bg-white/10 transition-all"
            title="Netzwerk QR-Code"
          >
            <QrCode className="w-5 h-5" />
          </button>

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="btn-primary text-sm shadow-md"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">VOD Hochladen</span>
          </button>
        </div>

      </div>
    </header>
  );
}
