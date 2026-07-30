import React, { useState } from 'react';
import { X, QrCode, Wifi, Smartphone, Copy, CheckCircle2, Server, Tv } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRCodeModal({ isOpen, onClose, systemInfo }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // DHCP Aware: Always derive exact URL from the active client connection
  const currentHost = window.location.hostname || 'localhost';
  const currentPort = window.location.port || '5000';
  const streamUrl = `http://${currentHost}:${currentPort}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(streamUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#07090e] border border-cyan-500/30 w-full max-w-md rounded-xl shadow-2xl overflow-hidden p-6 space-y-5 text-center relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-2">
            <Wifi className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-white">DHCP Smartphone Stream Link</h2>
          <p className="text-xs text-gray-400">
            Scanne den QR-Code mit deinem Handy, um ein Test-Video live hochzuladen!
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-xl w-48 h-48 mx-auto flex items-center justify-center shadow-xl border border-cyan-500/40">
          <QRCodeSVG
            value={streamUrl}
            size={168}
            bgColor="#ffffff"
            fgColor="#07090e"
            level="H"
            includeMargin={false}
          />
        </div>

        {/* URL Box */}
        <div className="p-3 rounded-md bg-black/60 border border-white/10 flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold text-cyan-400 tracking-wide truncate">
            {streamUrl}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
            title="URL Kopieren"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-2 text-left text-xs bg-white/[0.03] p-3 rounded-md border border-white/5 font-mono">
          <div>
            <span className="text-gray-500 block">Host Node:</span>
            <span className="font-semibold text-gray-200 truncate block">
              {systemInfo?.hostname || 'Proxmox NUC'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">DHCP IP:</span>
            <span className="font-semibold text-cyan-400 truncate block">
              {currentHost}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="flex justify-around text-xs text-gray-400 pt-1">
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>Handy Kamera Stream</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Tv className="w-4 h-4 text-blue-400" />
            <span>Smart-TV Browser</span>
          </div>
        </div>

      </div>
    </div>
  );
}
