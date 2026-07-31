import React from 'react';

const categories = [
  { name: 'All',             label: 'ALLE' },
  { name: 'Spiele',          label: 'SPIELE' },
  { name: 'Interviews',      label: 'INTERVIEWS' },
  { name: 'Training',        label: 'TRAINING' },
  { name: 'Highlights',      label: 'HIGHLIGHTS' },
  { name: 'Hinter_Kulissen', label: 'BEHIND THE SCENES' },
  { name: 'News',            label: 'NEWS & BERICHTE' },
];

export default function Sidebar({ selectedCategory, setSelectedCategory }) {
  return (
    <>
      {/* Mobile: horizontal scrollable pills */}
      <nav className="sidebar-mobile">
        <div className="sidebar-mobile-scroll">
          {categories.map(({ name, label }) => (
            <button
              key={name}
              className={`category-pill${selectedCategory === name ? ' active' : ''}`}
              onClick={() => setSelectedCategory(name)}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop: vertical sidebar */}
      <aside className="sidebar-desktop">
        <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.14em', padding: '0 14px 12px', textTransform: 'uppercase' }}>
          KATEGORIEN
        </div>
        <nav className="sidebar-nav">
          {categories.map(({ name, label }) => (
            <button
              key={name}
              className={`category-pill${selectedCategory === name ? ' active' : ''}`}
              onClick={() => setSelectedCategory(name)}
            >
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
