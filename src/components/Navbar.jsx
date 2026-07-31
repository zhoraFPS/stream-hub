import React, { useState, useRef, useEffect } from 'react';

// VfL Bochum TV Logo – Bold Square Badge
function VflLogo({ size = 32 }) {
  return (
    <div style={{ width: size, height: size, background: '#0055B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 13, letterSpacing: '0.05em' }}>
      VfL
    </div>
  );
}

export default function Navbar({
  search, setSearch,
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
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 16, height: '100%' }}>

        {/* Logo */}
        <button onClick={onHome}
          style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0 }}>
          <VflLogo size={34} />
          <div style={{ display: 'none', flexDirection: 'column', lineHeight: 1.1, textAlign: 'left' }} className="logo-text">
            <span style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>VfL Bochum 1848</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#0055B8', letterSpacing: '0.14em', textTransform: 'uppercase' }}>TV PORTAL</span>
          </div>
        </button>

        {/* Search */}
        <div style={{ flex: 1, maxWidth: 440, display: 'none' }} className="search-wrap">
          <input
            type="search"
            placeholder="VIDEOS SUCHEN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-search"
            style={{ width: '100%', textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.06em', padding: '10px 16px' }}
          />
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Live indicator */}
        {isLive && (
          <div className="live-badge">
            LIVE
          </div>
        )}

        {/* QR/Network Info */}
        {systemInfo && (
          <button onClick={onOpenQR} className="btn-secondary"
            style={{ fontSize: 11, padding: '8px 12px' }}>
            <span style={{ display: 'none' }} className="ip-text">{systemInfo.localIp}</span>
            <span className="ip-mobile-text">NETZWERK</span>
          </button>
        )}

        {/* Upload (only logged in) */}
        {authToken && (
          <button onClick={onOpenUpload} className="btn-primary"
            style={{ fontSize: 11, padding: '8px 14px' }}>
            HOCHLADEN
          </button>
        )}

        {/* Auth section */}
        {currentUser ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', border: 'none', padding: '6px 12px', cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ width: 24, height: 24, background: '#0055b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                {currentUser.avatar_url
                  ? <img src={currentUser.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (currentUser.display_name || currentUser.username || '?')[0].toUpperCase()
                }
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', display: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }} className="username-text">
                {currentUser.display_name || currentUser.username}
              </span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>▼</span>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: 'var(--bg-card)', padding: 6, minWidth: 200, boxShadow: '0 12px 32px rgba(0,0,0,0.8)', zIndex: 200 }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase' }}>{currentUser.display_name || currentUser.username}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>@{currentUser.username}</div>
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
            style={{ fontSize: 11, padding: '8px 16px' }}>
            ANMELDEN
          </button>
        )}
      </div>
    </header>
  );
}

function MenuItem({ label, onClick, danger }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '10px 14px', border: 'none', cursor: 'pointer', background: 'none', textAlign: 'left', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', color: danger ? '#ef4444' : '#ffffff', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
      {label}
    </button>
  );
}
