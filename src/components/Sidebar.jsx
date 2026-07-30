import React from 'react';
import { Home, Film, Gamepad2, GraduationCap, Video, Cpu } from 'lucide-react';

const categories = [
  { name: 'All', label: 'Alle', icon: Home },
  { name: 'Gaming', label: 'Gaming', icon: Gamepad2 },
  { name: 'Movies', label: 'Filme', icon: Film },
  { name: 'Tutorials', label: 'Tutorials', icon: GraduationCap },
  { name: 'Proxmox', label: 'Server', icon: Cpu },
  { name: 'General', label: 'Sonstiges', icon: Video },
];

export default function Sidebar({ selectedCategory, setSelectedCategory }) {
  return (
    <>
      {/* Mobile: horizontal scrollable pills */}
      <nav className="sidebar-mobile">
        <div className="sidebar-mobile-scroll">
          {categories.map(({ name, label, icon: Icon }) => (
            <button
              key={name}
              className={`category-pill${selectedCategory === name ? ' active' : ''}`}
              onClick={() => setSelectedCategory(name)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop: vertical aside */}
      <aside className="sidebar-desktop">
        <nav className="sidebar-nav">
          {categories.map(({ name, label, icon: Icon }) => (
            <button
              key={name}
              className={`category-pill${selectedCategory === name ? ' active' : ''}`}
              onClick={() => setSelectedCategory(name)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
