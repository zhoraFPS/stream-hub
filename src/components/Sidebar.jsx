import React from 'react';
import { Home, Film, Gamepad2, GraduationCap, Sparkles, Video, Cpu } from 'lucide-react';

const CATEGORIES = [
  { name: 'All', label: 'Alle VODs', icon: Home },
  { name: 'Movies', label: 'Filme & Clips', icon: Film },
  { name: 'Gaming', label: 'Gaming Streams', icon: Gamepad2 },
  { name: 'Tutorials', label: 'Tutorials & Tech', icon: GraduationCap },
  { name: 'Proxmox', label: 'Proxmox / NUC', icon: Cpu },
  { name: 'General', label: 'Sonstiges', icon: Video },
];

export default function Sidebar({ selectedCategory, setSelectedCategory }) {
  return (
    <aside className="w-full lg:w-64 shrink-0 px-4 py-4">
      {/* Category List for Desktop & Horizontal scroll for mobile */}
      <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-2 lg:pb-0 scrollbar-none">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-1 hidden lg:block mb-1">
          Kategorien
        </div>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md shadow-red-500/20'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      <hr className="my-4 border-white/10 hidden lg:block" />

      {/* Proxmox NUC Badge */}
      <div className="hidden lg:block p-3.5 rounded-xl bg-gradient-to-b from-purple-900/20 to-black/40 border border-purple-500/20 text-xs">
        <div className="flex items-center gap-2 text-purple-400 font-semibold mb-1">
          <Sparkles className="w-4 h-4 text-purple-400" />
          Proxmox VE Speed Mode
        </div>
        <p className="text-gray-400 leading-relaxed text-[11px]">
          HTTP 206 Direct Range Streaming aktiv. VODs starten ohne Ladezeit im lokalen Netz.
        </p>
      </div>
    </aside>
  );
}
