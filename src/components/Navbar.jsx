import React, { useState, useRef, useEffect } from 'react';
import Logo from './ui/Logo';
import Icon from './ui/Icon';

/**
 * Kopfzeile nach dem b-header Muster: Logo links, Uppercase-Navigation,
 * Aktionen rechts. Auf der Startseite liegt sie transparent über dem Hero
 * (variant="overlay"), sonst als feste Leiste auf der Fläche.
 */
export default function Navbar({
  onSearch, initialSearch = '',
  onOpenUpload, onOpenQR,
  systemInfo, isLive,
  currentUser, authToken,
  onLogin, onLogout,
  onOpenChannel, onOpenSettings, onOpenStudio,
  onHome, onOpenLive,
  variant = 'solid',
  activePage,
}) {
  // Hochladen und Studio sind Redaktionswerkzeuge — ein Zuschauerkonto sieht sie nicht.
  const mayPublish = currentUser?.role === 'editor' || currentUser?.role === 'admin';
  const [menuOpen, setMenuOpen] = useState(false);
  const [term, setTerm] = useState(initialSearch);
  const menuRef = useRef(null);

  // Beim Wechsel auf eine Suchadresse steht der Begriff schon im Feld.
  useEffect(() => { setTerm(initialSearch); }, [initialSearch]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  const navItems = [
    { key: 'home', label: 'Start', onClick: onHome },
    isLive && { key: 'live', label: 'Live', onClick: onOpenLive },
    mayPublish && { key: 'studio', label: 'Studio', onClick: onOpenStudio },
  ].filter(Boolean);

  return (
    <header className={`b-header${variant === 'solid' ? ' b-header--solid' : ''}`}>
      <Logo onClick={onHome} />

      <div className="b-header__bar">
        <nav className="b-menu__main" aria-label="Hauptnavigation">
          {navItems.map(item => (
            <button
              key={item.key}
              type="button"
              className={`b-menu__main-link${activePage === item.key ? ' --is-active' : ''}`}
              onClick={item.onClick}
            >
              {item.label}
              {item.key === 'live' && (
                <span className="b-badge b-badge--live b-badge--static" style={{ marginLeft: 'var(--space-3xs)' }}>
                  Live
                </span>
              )}
            </button>
          ))}
        </nav>

        {onSearch && (
          // Absenden statt Mittippen: die Suche hat eine eigene Adresse, und
          // niemand soll bei jedem Buchstaben eine neue Seite bekommen.
          <form
            onSubmit={(e) => { e.preventDefault(); onSearch(term.trim()); }}
            style={{ position: 'relative', flex: 1, maxWidth: 300, minWidth: 0 }}
            role="search"
          >
            <label className="b-visually-hidden" htmlFor="mediathek-suche">Mediathek durchsuchen</label>
            <input
              id="mediathek-suche"
              type="search"
              className="b-input"
              placeholder="Suchen"
              value={term}
              onChange={e => setTerm(e.target.value)}
              style={{ paddingLeft: 'var(--space-l)' }}
            />
            <Icon
              name="search"
              size={16}
              style={{
                position: 'absolute',
                left: 'var(--space-2xs)',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: .5,
                pointerEvents: 'none',
              }}
            />
          </form>
        )}
      </div>

      <div className="b-header__actions">
        {systemInfo && (
          <button type="button" onClick={onOpenQR} className="b-button b-button--ghost b-button--s b-hide-narrow">
            {systemInfo.localIp || 'Netzwerk'}
          </button>
        )}

        {mayPublish && (
          <button type="button" onClick={onOpenUpload} className="b-button b-button--secondary b-button--s">
            Hochladen
          </button>
        )}

        {currentUser ? (
          <div className="b-usermenu" ref={menuRef}>
            <button
              type="button"
              className="b-usermenu__trigger"
              onClick={() => setMenuOpen(o => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="b-avatar">
                {currentUser.avatar_url
                  ? <img src={currentUser.avatar_url} alt="" />
                  : (currentUser.display_name || currentUser.username || '?')[0].toUpperCase()}
              </span>
              <span className="b-kicker b-hide-narrow" style={{ fontSize: 'var(--step--2)' }}>
                {currentUser.display_name || currentUser.username}
              </span>
            </button>

            {menuOpen && (
              <div className="b-usermenu__panel" role="menu">
                <div style={{ padding: 'var(--space-2xs) var(--space-xs)', borderBottom: '1px solid var(--color-line)' }}>
                  <div className="b-kicker">{currentUser.display_name || currentUser.username}</div>
                  <div className="b-meta-line__item">@{currentUser.username}</div>
                </div>
                <button type="button" role="menuitem" className="b-usermenu__item"
                  onClick={() => { setMenuOpen(false); onOpenChannel?.(); }}>
                  Mein Kanal
                </button>
                {mayPublish && (
                  <button type="button" role="menuitem" className="b-usermenu__item"
                    onClick={() => { setMenuOpen(false); onOpenStudio?.(); }}>
                    Live-Studio
                  </button>
                )}
                <button type="button" role="menuitem" className="b-usermenu__item"
                  onClick={() => { setMenuOpen(false); onOpenSettings?.(); }}>
                  Einstellungen
                </button>
                <button type="button" role="menuitem" className="b-usermenu__item b-usermenu__item--danger"
                  onClick={() => { setMenuOpen(false); onLogout(); }}>
                  Abmelden
                </button>
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={onLogin} className="b-button b-button--primary b-button--s">
            Anmelden
          </button>
        )}
      </div>
    </header>
  );
}
