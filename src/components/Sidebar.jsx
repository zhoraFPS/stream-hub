import React from 'react';
import { Home, Film, Gamepad2, GraduationCap, Sparkles, Video, Cpu } from 'lucide-react';

const CATEGORIES = [
  { name: 'All', label: 'Alle VODs', icon: Home },
  { name: 'Gaming', label: 'Gaming', icon: Gamepad2 },
  { name: 'Movies', label: 'Filme & Clips', icon: Film },
  { name: 'Tutorials', label: 'Tutorials & Tech', icon: GraduationCap },
  { name: 'Proxmox', label: 'Proxmox Server', icon: Cpu },
  { name: 'General', label: 'Sonstiges', icon: Video },
];

export default function Sidebar({ selectedCategory, setSelectedCategory }) {
  return (
    <aside className="w-full lg:w-64 shrink-0 px-2 py-2">
      <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 pb-2 lg:pb-0 scrollbar-none">
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1 hidden lg:block mb-1 font-mono">
          Kategorien
        </div>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`category-pill ${isActive ? 'active' : ''}`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      <hr className="my-4 border-white/10 hidden lg:block" />

      {/* Minimalist Info Card */}
      <div className="hidden lg:block p-3.5 glass-panel text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-blue-400 uppercase tracking-wider text-[11px]">
          <Sparkles className="w-3.5 h-3.5" />
          Proxmox Intel QSV
        </div>
        <p className="text-gray-400 text-[11px] leading-relaxed">
          Echtes Low-Latency Streaming direkt von deiner NUC SSD.
        </p>
      </div>
    </aside>
  );
}
