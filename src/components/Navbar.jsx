import React, { useState, useRef, useEffect } from 'react';
import { Search, Upload, Wifi, Radio, LogIn, LogOut, User, Settings, ChevronDown } from 'lucide-react';

// VfL Bochum TV Logo – Sharp Minimalist Square SVG
function VflLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="VfL Bochum TV Logo">
      <rect width="32" height="32" fill="#0055B8" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <path d="M7 9 L12 23 L16 13 L20 23 L25 9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" fill="none"/>
    </svg>
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
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, height: '100%' }}>

        {/* Logo */}
        <button onClick={onHome}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '4px 0' }}>
          <VflLogo size={32} />
          <div style={{ display: 'none', flexDirection: 'column', lineHeight: 1.1, textAlign: 'left' }} className="logo-text">
            <span style={{ fontSize: 14, fontWeight: 900, color: '#f8fafc', letterSpacing: '0.04em', textTransform: 'uppercase' }}>VfL Bochum</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#0055B8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>TV PORTAL</span>
          </div>
        </button>

        {/* Search */}
        <div style={{ flex: 1, maxWidth: 480, display: 'none', position: 'relative' }} className="search-wrap">
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#64748b', pointerEvents: 'none' }} />
          <input
            type="search"
            placeholder="VIDEOS SUCHEN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-search"
            style={{ width: '100%', paddingLeft: 36, textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.05em' }}
          />
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Live indicator */}
        {isLive && (
          <div className="live-badge">
            <span style={{ width: 6, height: 6, background: '#fff', animation: 'pulse 1.5s infinite' }} />
            LIVE
          </div>
        )}

        {/* QR/Network Info */}
        {systemInfo && (
          <button onClick={onOpenQR} className="btn-secondary"
            style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}>
            <Wifi style={{ width: 14, height: 14 }} />
            <span style={{ display: 'none' }} className="ip-text">{systemInfo.localIp}</span>
          </button>
        )}

        {/* Upload (only logged in) */}
        {authToken && (
          <button onClick={onOpenUpload} className="btn-primary"
            style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}>
            <Upload style={{ width: 14, height: 14 }} />
            <span style={{ display: 'none' }} className="upload-text">HOCHLADEN</span>
          </button>
        )}

        {/* Auth section */}
        {currentUser ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '5px 10px 5px 5px', cursor: 'pointer', transition: 'all 0.15s' }}>
              {/* Avatar */}
              <div style={{ width: 28, height: 28, background: '#0055b8', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                {currentUser.avatar_url
                  ? <img src={currentUser.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (currentUser.display_name || currentUser.username || '?')[0].toUpperCase()
                }
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', display: 'none', textTransform: 'uppercase', letterSpacing: '0.04em' }} className="username-text">
                {currentUser.display_name || currentUser.username}
              </span>
              <ChevronDown style={{ width: 13, height: 13, color: '#64748b' }} />
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: 'var(--bg-card)', border: '1px solid var(--border-strong)', padding: 4, minWidth: 190, boxShadow: '0 8px 24px rgba(0,0,0,0.7)', zIndex: 200 }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase' }}>{currentUser.display_name || currentUser.username}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>@{currentUser.username}</div>
                </div>
                <MenuItem icon={User} label="MEIN KANAL" onClick={() => { setMenuOpen(false); onOpenChannel?.(); }} />
                <MenuItem icon={Settings} label="EINSTELLUNGEN" onClick={() => { setMenuOpen(false); onOpenSettings?.(); }} />
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                  <MenuItem icon={LogOut} label="ABMELDEN" onClick={() => { setMenuOpen(false); onLogout(); }} danger />
                </div>
              </div>
            )}
          </div>
        ) : (
          <button onClick={onLogin} className="btn-primary"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px' }}>
            <LogIn style={{ width: 14, height: 14 }} />
            <span>ANMELDEN</span>
          </button>
        )}
      </div>
    </header>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: 'none', cursor: 'pointer', background: 'none', textAlign: 'left', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', color: danger ? '#ef4444' : '#e2e8f0', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
      <Icon style={{ width: 14, height: 14, opacity: 0.8 }} />
      {label}
    </button>
  );
}
