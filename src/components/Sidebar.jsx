import React from 'react';
import { Home, Trophy, Mic2, Dumbbell, Star, Video, Newspaper } from 'lucide-react';

const categories = [
  { name: 'All',          label: 'Alle',           icon: Home },
  { name: 'Spiele',       label: 'Spiele',          icon: Trophy },
  { name: 'Interviews',   label: 'Interviews',      icon: Mic2 },
  { name: 'Training',     label: 'Training',        icon: Dumbbell },
  { name: 'Highlights',   label: 'Highlights',      icon: Star },
  { name: 'Hinter_Kulissen', label: 'Behind the Scenes', icon: Video },
  { name: 'News',         label: 'News & Berichte', icon: Newspaper },
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
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
