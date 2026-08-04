import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, hasDecided, saveConsent, readConsent, subscribeConsent } from '../utils/consent';

/**
 * Einwilligungsbanner.
 *
 * „Alle akzeptieren" und „Nur notwendige" stehen gleichwertig nebeneinander —
 * ein hervorgehobener Zustimmen-Knopf neben einem versteckten Ablehnen wäre
 * keine freie Entscheidung. Vorausgewählt ist nichts, was nicht notwendig ist.
 *
 * Der Dialog erscheint außerdem erneut, wenn jemand unten im Fuß auf
 * „Cookie-Einstellungen" klickt.
 */
export default function CookieNotice() {
  const [offen, setOffen] = useState(() => !hasDecided());
  const [details, setDetails] = useState(false);
  const [auswahl, setAuswahl] = useState(() => ({ external: !!readConsent()?.external }));

  // Wird die Entscheidung woanders zurückgesetzt, fragt der Dialog erneut.
  useEffect(() => subscribeConsent(() => {
    const stand = readConsent();
    setOffen(stand === null);
    setAuswahl({ external: !!stand?.external });
  }), []);

  if (!offen) return null;

  const entscheiden = (werte) => {
    saveConsent(werte);
    setOffen(false);
  };

  return (
    <div
      className="b-consent"
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-titel"
      aria-describedby="consent-text"
    >
      <div className="b-consent__inner">
        <div>
          <div className="b-kicker" id="consent-titel" style={{ marginBottom: 'var(--space-3xs)' }}>
            Datenschutz
          </div>
          <p className="b-copy b-copy--front" id="consent-text">
            1848TV nutzt technisch notwendige Cookies für Anmeldung und interne Videos.
            Zusätzlich können externe Dienste eingebunden werden — dafür brauchen wir
            deine Zustimmung.{' '}
            <Link to="/datenschutz" style={{ textDecoration: 'underline' }}>Mehr im Datenschutz</Link>
          </p>

          <button
            type="button"
            className="b-consent__toggle"
            onClick={() => setDetails(d => !d)}
            aria-expanded={details}
          >
            {details ? 'Details ausblenden' : 'Details anzeigen'}
          </button>

          {details && (
            <ul className="b-consent__list">
              {CATEGORIES.map(kategorie => (
                <li key={kategorie.key} className="b-consent__item">
                  <label className="b-consent__label">
                    <input
                      type="checkbox"
                      checked={kategorie.required || !!auswahl[kategorie.key]}
                      disabled={kategorie.required}
                      onChange={e => setAuswahl(a => ({ ...a, [kategorie.key]: e.target.checked }))}
                    />
                    <span>
                      <span className="b-kicker">
                        {kategorie.label}
                        {kategorie.required && <span style={{ opacity: .5 }}> · immer aktiv</span>}
                      </span>
                      <span className="b-copy" style={{ display: 'block' }}>{kategorie.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="b-consent__actions">
          <button
            type="button"
            className="b-button b-button--primary b-button--s"
            onClick={() => entscheiden({ external: true })}
          >
            Alle akzeptieren
          </button>
          <button
            type="button"
            className="b-button b-button--secondary b-button--s"
            onClick={() => entscheiden({ external: false })}
          >
            Nur notwendige
          </button>
          {details && (
            <button
              type="button"
              className="b-button b-button--ghost b-button--s"
              onClick={() => entscheiden(auswahl)}
            >
              Auswahl speichern
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
