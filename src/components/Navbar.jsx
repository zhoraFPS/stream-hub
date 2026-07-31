import React, { useState, useRef, useEffect } from 'react';
import { PlaySquare, Search, Upload, Wifi, QrCode, Radio, LogIn, LogOut, User, Settings, ChevronDown } from 'lucide-react';

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
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '4px 0' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #0055b8, #0068e0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlaySquare style={{ width: 18, height: 18, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', display: 'none' }} className="logo-text">StreamHub</span>
        </button>

        {/* Search */}
        <div style={{ flex: 1, maxWidth: 480, display: 'none', position: 'relative' }} className="search-wrap">
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#475569', pointerEvents: 'none' }} />
          <input
            type="search"
            placeholder="Videos suchen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-search"
            style={{ width: '100%', paddingLeft: 38 }}
          />
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Live indicator */}
        {isLive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
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
          <button onClick={onOpenUpload} className="btn-secondary"
            style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}>
            <Upload style={{ width: 14, height: 14 }} />
            <span style={{ display: 'none' }} className="upload-text">Hochladen</span>
          </button>
        )}

        {/* Auth section */}
        {currentUser ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px 5px 5px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
              {/* Avatar */}
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #0055b8, #0068e0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                {currentUser.avatar_url
                  ? <img src={currentUser.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (currentUser.display_name || currentUser.username || '?')[0].toUpperCase()
                }
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', display: 'none' }} className="username-text">
                {currentUser.display_name || currentUser.username}
              </span>
              <ChevronDown style={{ width: 13, height: 13, color: '#64748b' }} />
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 6, minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 200 }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{currentUser.display_name || currentUser.username}</div>
                  <div style={{ fontSize: 11, color: '#475569' }}>@{currentUser.username}</div>
                </div>
                <MenuItem icon={User} label="Mein Kanal" onClick={() => { setMenuOpen(false); onOpenChannel?.(); }} />
                <MenuItem icon={Settings} label="Einstellungen" onClick={() => { setMenuOpen(false); onOpenSettings?.(); }} />
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                  <MenuItem icon={LogOut} label="Abmelden" onClick={() => { setMenuOpen(false); onLogout(); }} danger />
                </div>
              </div>
            )}
          </div>
        ) : (
          <button onClick={onLogin} className="btn-primary"
            style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px' }}>
            <LogIn style={{ width: 14, height: 14 }} />
            <span>Anmelden</span>
          </button>
        )}
      </div>
    </header>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'none', textAlign: 'left', fontSize: 13, color: danger ? '#ef4444' : '#e2e8f0', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
      <Icon style={{ width: 15, height: 15, opacity: 0.7 }} />
      {label}
    </button>
  );
}
