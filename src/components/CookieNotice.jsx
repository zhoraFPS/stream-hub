import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { hasDecided, saveConsent } from '../utils/consent';

/**
 * Hinweis statt Abfrage.
 *
 * Wir setzen nur technisch notwendige Cookies und laden nichts von fremden
 * Servern — dafür braucht es keine Einwilligung. Ein „Alle akzeptieren"-Knopf
 * neben einem „Ablehnen"-Knopf, bei dem beides zum selben Ergebnis führt, wäre
 * eine Scheinwahl. Sobald tatsächlich Reichweitenmessung dazukommt, wird aus
 * diesem Hinweis über die Kategorien in utils/consent.js eine echte Abfrage.
 */
export default function CookieNotice() {
  const [sichtbar, setSichtbar] = useState(() => !hasDecided());

  if (!sichtbar) return null;

  const bestaetigen = () => {
    saveConsent({});
    setSichtbar(false);
  };

  return (
    <div className="b-consent" role="dialog" aria-live="polite" aria-label="Hinweis zu Cookies">
      <div className="b-consent__inner">
        <div>
          <div className="b-kicker" style={{ marginBottom: 'var(--space-3xs)' }}>Cookies</div>
          <p className="b-copy b-copy--front">
            1848TV nutzt ausschließlich technisch notwendige Cookies — für die Anmeldung und
            den Zugriff auf interne Videos. Keine Reichweitenmessung, keine Werbenetzwerke,
            keine Inhalte von fremden Servern.{' '}
            <Link to="/datenschutz" style={{ textDecoration: 'underline' }}>Mehr im Datenschutz</Link>
          </p>
        </div>
        <button type="button" className="b-button b-button--primary b-button--s" onClick={bestaetigen}>
          Verstanden
        </button>
      </div>
    </div>
  );
}
