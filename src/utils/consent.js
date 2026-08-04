/**
 * Einwilligung nach DSGVO und § 25 TTDSG.
 *
 * Notwendige Dinge laufen ohne Zustimmung — ohne sie funktioniert die Seite
 * nicht. Alles, was Daten an Dritte gibt, braucht eine aktive Entscheidung und
 * bleibt bis dahin aus. Deshalb lädt etwa das Cast-SDK von Google erst, wenn
 * jemand „Externe Dienste" erlaubt hat: bis dahin erfährt Google nicht einmal,
 * dass die Seite geöffnet wurde.
 *
 * Ablehnen ist genauso leicht wie Zustimmen — ein „Alle akzeptieren" ohne
 * gleichwertiges Gegenstück wäre keine freie Entscheidung.
 */

const STORAGE_KEY = 'vfl_consent';

/** Ändert sich, was verarbeitet wird, muss neu gefragt werden. */
const VERSION = 2;

export const CATEGORIES = [
  {
    key: 'essential',
    label: 'Notwendig',
    required: true,
    description:
      'Anmeldung, Zugriff auf interne Videos und das Speichern dieser Auswahl. '
      + 'Ohne diese Angaben funktioniert die Seite nicht.',
  },
  {
    key: 'external',
    label: 'Externe Dienste',
    required: false,
    description:
      'Google Cast, um Videos an einen Chromecast zu schicken. Dafür wird ein '
      + 'Programmbaustein von google.com geladen; dabei erfährt Google deine '
      + 'IP-Adresse. Ohne Zustimmung bleibt der Cast-Knopf aus — abspielen '
      + 'lässt sich alles trotzdem, auch über AirPlay.',
  },
];

const zuhoerer = new Set();

function bekanntgeben() {
  zuhoerer.forEach(fn => { try { fn(readConsent()); } catch {} });
}

/** Für Komponenten, die auf eine Änderung reagieren müssen. */
export function subscribeConsent(fn) {
  zuhoerer.add(fn);
  return () => zuhoerer.delete(fn);
}

export function readConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConsent(choices = {}) {
  const record = {
    version: VERSION,
    decidedAt: new Date().toISOString(),
    essential: true,
    external: !!choices.external,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Privates Fenster ohne Speicher: dann eben bei jedem Besuch erneut fragen.
  }
  bekanntgeben();
  return record;
}

/** Setzt die Entscheidung zurück, damit erneut gefragt wird. */
export function resetConsent() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  bekanntgeben();
}

export function hasDecided() {
  return readConsent() !== null;
}

export function allows(category) {
  if (category === 'essential') return true;
  return !!readConsent()?.[category];
}
