import React from 'react';
import { X, QrCode, Wifi, Tv, Smartphone, Copy, CheckCircle2, Server } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRCodeModal({ isOpen, onClose, systemInfo }) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !systemInfo) return null;

  const streamUrl = `http://${systemInfo.localIp}:${systemInfo.port}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(streamUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-cyan-500/30 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 text-center relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-2">
            <Wifi className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white">Lokales Streaming-Netzwerk</h2>
          <p className="text-xs text-gray-400">
            Scanne den QR-Code mit deinem Smartphone oder Smart TV
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg border border-cyan-500/40">
          <QRCodeSVG
            value={streamUrl}
            size={168}
            bgColor="#ffffff"
            fgColor="#0f0f12"
            level="H"
            includeMargin={false}
          />
        </div>

        {/* URL Box */}
        <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-semibold text-cyan-400 tracking-wide truncate">
            {streamUrl}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
            title="URL Kopieren"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* System Specs */}
        <div className="grid grid-cols-2 gap-2 text-left text-xs bg-white/[0.03] p-3 rounded-xl border border-white/5">
          <div>
            <span className="text-gray-400 block">Host System:</span>
            <span className="font-semibold text-gray-200 flex items-center gap-1">
              <Server className="w-3 h-3 text-purple-400" />
              {systemInfo.hostname} ({systemInfo.platform})
            </span>
          </div>
          <div>
            <span className="text-gray-400 block">RAM Auslastung:</span>
            <span className="font-semibold text-gray-200">
              {systemInfo.freeMem} frei / {systemInfo.totalMem}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="flex justify-around text-xs text-gray-400 pt-1">
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>Smartphone & Tablet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Tv className="w-4 h-4 text-red-400" />
            <span>Smart TV Browser</span>
          </div>
        </div>

      </div>
    </div>
  );
}
