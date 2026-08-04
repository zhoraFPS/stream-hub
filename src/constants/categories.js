/**
 * Kanonische Kategorien für 1848TV.
 *
 * Abgeleitet aus dem Inhaltsmodell von vfl1848.tv: Spiele, Highlights,
 * Pressekonferenzen, Interviews, Training, Behind the Scenes, News.
 *
 * Wichtig: Navbar, Upload und Filter greifen alle auf diese eine Liste zu.
 * Vorher liefen Navbar ('Gaming', 'Movies', …) und Upload ('Spiele',
 * 'Interviews', …) auseinander, wodurch die Filter leer blieben.
 * `value` landet so in der Datenbank — beim Umbenennen Bestand migrieren.
 */
export const CATEGORIES = [
  { value: 'Spiele',           label: 'Spiele' },
  { value: 'Highlights',       label: 'Highlights' },
  { value: 'Pressekonferenz',  label: 'Pressekonferenzen' },
  { value: 'Interviews',       label: 'Interviews' },
  { value: 'Training',         label: 'Training' },
  { value: 'Hinter_Kulissen',  label: 'Behind the Scenes' },
  { value: 'News',             label: 'News' },
];

/** Chips inklusive „Alle" — für Filterleisten. */
export const CATEGORY_FILTERS = [{ value: 'All', label: 'Alle' }, ...CATEGORIES];

/** Anzeigename zu einem gespeicherten Wert. Unbekanntes fällt auf sich selbst zurück. */
export function categoryLabel(value) {
  if (!value || value === 'General') return 'Sonstiges';
  return CATEGORIES.find(c => c.value === value)?.label || value;
}

/**
 * Archiv-Einordnung.
 *
 * `category` sagt, *was* ein Video ist (Highlights, Pressekonferenz). Die
 * Angaben hier sagen, *wozu* es gehört — dieselbe Trennung nutzt vfl1848.tv,
 * wo die Navigation nach „Bundesliga 2025/26 → 34. Spieltag" gegliedert ist.
 * Alle Angaben sind freiwillig: ein Interview gehört zu keinem Spieltag.
 */
export const TEAMS = ['Profis', 'Frauen', 'U21', 'U19', 'U17'];

export const COMPETITIONS = ['2. Bundesliga', 'Bundesliga', 'DFB-Pokal', 'Testspiel'];

export const MAX_MATCHDAY = 38;

/** Saisonliste rückwärts ab der laufenden. Wechsel ist im Juli. */
export function recentSeasons(count = 8, now = new Date()) {
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: count }, (_, i) => {
    const from = startYear - i;
    return `${from}/${String((from + 1) % 100).padStart(2, '0')}`;
  });
}

/** „2. Bundesliga · 34. Spieltag" — Schreibweise wie auf vfl-bochum.de. */
export function matchLabel({ competition, matchday, season } = {}) {
  const parts = [];
  if (competition) parts.push(season ? `${competition} ${season}` : competition);
  if (matchday) parts.push(`${matchday}. Spieltag`);
  return parts.join(' · ');
}
