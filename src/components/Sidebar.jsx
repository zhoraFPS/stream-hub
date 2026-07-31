import React from 'react';
import { Home, Trophy, Mic2, Dumbbell, Star, Video, Newspaper } from 'lucide-react';

const categories = [
  { name: 'All',             label: 'ALLE',               icon: Home },
  { name: 'Spiele',          label: 'SPIELE',             icon: Trophy },
  { name: 'Interviews',      label: 'INTERVIEWS',         icon: Mic2 },
  { name: 'Training',        label: 'TRAINING',           icon: Dumbbell },
  { name: 'Highlights',      label: 'HIGHLIGHTS',         icon: Star },
  { name: 'Hinter_Kulissen', label: 'BEHIND THE SCENES', icon: Video },
  { name: 'News',            label: 'NEWS',               icon: Newspaper },
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
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop: vertical aside */}
      <aside className="sidebar-desktop">
        <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.12em', padding: '0 12px 10px', textTransform: 'uppercase' }}>
          Kategorien
        </div>
        <nav className="sidebar-nav">
          {categories.map(({ name, label, icon: Icon }) => (
            <button
              key={name}
              className={`category-pill${selectedCategory === name ? ' active' : ''}`}
              onClick={() => setSelectedCategory(name)}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
