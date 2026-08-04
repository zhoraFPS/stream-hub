/**
 * Einwilligung für nicht notwendige Dienste.
 *
 * Stand heute setzt die Plattform ausschließlich technisch notwendige Cookies
 * und lädt nichts von fremden Servern. Dafür ist nach DSGVO und TTDSG keine
 * Einwilligung nötig — ein Banner mit „Akzeptieren/Ablehnen" wäre an dieser
 * Stelle wirkungslos und würde nur suggerieren, es gäbe etwas zu entscheiden.
 *
 * Der Hinweis informiert deshalb, statt zu fragen. Die Kategorien darunter
 * existieren trotzdem schon: sobald Reichweitenmessung oder eingebettete
 * Inhalte dazukommen, wird daraus ohne Umbau eine echte Abfrage.
 */

const STORAGE_KEY = 'vfl_consent';
const VERSION = 1;

/** Notwendig ist nicht abwählbar — ohne diese Dinge funktioniert die Seite nicht. */
export const CATEGORIES = [
  {
    key: 'essential',
    label: 'Notwendig',
    required: true,
    description: 'Anmeldung, Zugriff auf interne Videos, Speicherung dieser Auswahl.',
  },
  {
    key: 'statistics',
    label: 'Statistik',
    required: false,
    description: 'Derzeit nicht im Einsatz.',
  },
  {
    key: 'external',
    label: 'Externe Inhalte',
    required: false,
    description: 'Derzeit nicht im Einsatz.',
  },
];

export function readConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Ändert sich, was verarbeitet wird, muss neu gefragt werden.
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
    statistics: !!choices.statistics,
    external: !!choices.external,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Privates Fenster ohne Speicher: dann eben bei jedem Besuch erneut.
  }
  return record;
}

export function hasDecided() {
  return readConsent() !== null;
}

export function allows(category) {
  if (category === 'essential') return true;
  return !!readConsent()?.[category];
}
