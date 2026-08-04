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
