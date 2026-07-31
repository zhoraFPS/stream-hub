import React, { useState, useRef, useEffect } from 'react';

const categories = [
  { name: 'All', label: 'ALLE' },
  { name: 'Gaming', label: 'SPIELE' },
  { name: 'Movies', label: 'INTERVIEWS' },
  { name: 'Tutorials', label: 'TRAINING' },
  { name: 'Highlights', label: 'HIGHLIGHTS' },
  { name: 'BehindTheScenes', label: 'BEHIND THE SCENES' },
  { name: 'General', label: 'NEWS' },
];

export default function Navbar({
  search, setSearch,
  selectedCategory, setSelectedCategory,
  onOpenUpload, onOpenQR,
  systemInfo, isLive,
  currentUser, authToken,
  onLogin, onLogout,
  onOpenChannel, onOpenSettings,
  onHome,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="sticky-nav">
      <div style={{ width: '100%', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, height: '100%' }}>

        {/* Integrated Category Navigation (Replaces Sidebar) */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => {
                if (setSelectedCategory) setSelectedCategory(cat.name);
                if (onHome) onHome();
              }}
              style={{
                padding: '7px 14px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                background: selectedCategory === cat.name ? '#0055b8' : 'transparent',
                color: selectedCategory === cat.name ? '#ffffff' : '#94a3b8',
                boxShadow: selectedCategory === cat.name ? '0 4px 14px rgba(0, 85, 184, 0.5)' : 'none',
              }}
              onMouseEnter={e => {
                if (selectedCategory !== cat.name) e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                if (selectedCategory !== cat.name) e.currentTarget.style.color = '#94a3b8';
              }}
            >
              {cat.label}
            </button>
          ))}
        </nav>

        {/* Search */}
        {setSearch && (
          <div style={{ flex: 1, maxWidth: 300, minWidth: 120 }} className="search-wrap">
            <input
              type="search"
              placeholder="SUCHEN…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-search"
              style={{ width: '100%', borderRadius: '9999px', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em', padding: '7px 14px', background: 'rgba(255,255,255,0.06)' }}
            />
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Live indicator */}
        {isLive && (
          <div className="live-badge" style={{ borderRadius: '9999px', padding: '4px 10px', fontSize: 10 }}>
            LIVE
          </div>
        )}

        {/* Network Info */}
        {systemInfo && (
          <button onClick={onOpenQR} className="btn-secondary"
            style={{ fontSize: 10, padding: '6px 12px', borderRadius: '9999px' }}>
            {systemInfo.localIp}
          </button>
        )}

        {/* Upload (only logged in) */}
        {authToken && (
          <button onClick={onOpenUpload} className="btn-primary"
            style={{ fontSize: 10, padding: '7px 14px', borderRadius: '9999px' }}>
            HOCHLADEN
          </button>
        )}

        {/* User Auth Menu */}
        {currentUser ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '9999px', padding: '4px 10px', cursor: 'pointer' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#0055b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                {currentUser.avatar_url
                  ? <img src={currentUser.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (currentUser.display_name || currentUser.username || '?')[0].toUpperCase()
                }
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase' }}>
                {currentUser.display_name || currentUser.username}
              </span>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'var(--bg-card)', padding: 6, minWidth: 180, boxShadow: '0 16px 40px rgba(0,0,0,0.8)', zIndex: 200, borderRadius: '12px' }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase' }}>{currentUser.display_name || currentUser.username}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>@{currentUser.username}</div>
                </div>
                <MenuItem label="MEIN KANAL" onClick={() => { setMenuOpen(false); onOpenChannel?.(); }} />
                <MenuItem label="EINSTELLUNGEN" onClick={() => { setMenuOpen(false); onOpenSettings?.(); }} />
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 4, paddingTop: 4 }}>
                  <MenuItem label="ABMELDEN" onClick={() => { setMenuOpen(false); onLogout(); }} danger />
                </div>
              </div>
            )}
          </div>
        ) : (
          <button onClick={onLogin} className="btn-primary"
            style={{ fontSize: 10, padding: '7px 14px', borderRadius: '9999px' }}>
            ANMELDEN
          </button>
        )}
      </div>
    </header>
  );
}

function MenuItem({ label, onClick, danger }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer', background: 'none', textAlign: 'left', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: danger ? '#ef4444' : '#ffffff', transition: 'background 0.1s', borderRadius: '6px' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
      {label}
    </button>
  );
}
