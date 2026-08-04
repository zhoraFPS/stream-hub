import React from 'react';
import {
  CATEGORIES, TEAMS, COMPETITIONS, MAX_MATCHDAY, recentSeasons,
} from '../../constants/categories';

/**
 * Die Angaben zu einem Video — geteilt zwischen Hochladen und Bearbeiten,
 * damit beide Formulare nicht auseinanderlaufen.
 *
 * `werte` und `setzen` kommen von außen: die Modale halten den Zustand, dieses
 * Bauteil zeichnet nur.
 */
export default function VideoMetaFields({ werte, setzen, idPrefix = 'video' }) {
  const feld = (name) => ({
    value: werte[name] ?? '',
    onChange: (e) => setzen(name, e.target.value),
  });

  return (
    <>
      <div className="b-field">
        <label className="b-label" htmlFor={`${idPrefix}-title`}>Titel</label>
        <input
          id={`${idPrefix}-title`}
          className="b-input"
          type="text"
          placeholder="Testspiel VfL Bochum 1848 gegen Swansea City"
          {...feld('title')}
        />
      </div>

      <div className="b-field">
        <label className="b-label" htmlFor={`${idPrefix}-description`}>Beschreibung</label>
        <textarea
          id={`${idPrefix}-description`}
          className="b-input"
          rows={3}
          placeholder="Worum geht es in diesem Video?"
          {...feld('description')}
        />
      </div>

      <div className="b-field">
        <label className="b-label" htmlFor={`${idPrefix}-category`}>Kategorie</label>
        <select id={`${idPrefix}-category`} className="b-input" {...feld('category')}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Einordnung ins Archiv — alles freiwillig. Ein Interview gehört zu
          keinem Spieltag, ein Trainingslager-Vlog zu keinem Wettbewerb. */}
      <fieldset style={{ border: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' }}>
        <legend className="b-label" style={{ marginBottom: 'var(--space-3xs)' }}>
          Einordnung <span style={{ textTransform: 'none', opacity: .6 }}>(optional)</span>
        </legend>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-2xs)' }}>
          <div className="b-field">
            <label className="b-label" htmlFor={`${idPrefix}-team`}>Mannschaft</label>
            <select id={`${idPrefix}-team`} className="b-input" {...feld('team')}>
              <option value="">—</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="b-field">
            <label className="b-label" htmlFor={`${idPrefix}-competition`}>Wettbewerb</label>
            <select id={`${idPrefix}-competition`} className="b-input" {...feld('competition')}>
              <option value="">—</option>
              {COMPETITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="b-field">
            <label className="b-label" htmlFor={`${idPrefix}-season`}>Saison</label>
            <select id={`${idPrefix}-season`} className="b-input" {...feld('season')}>
              <option value="">—</option>
              {/* Eine bereits gespeicherte ältere Saison muss wählbar bleiben. */}
              {[...new Set([...(werte.season ? [werte.season] : []), ...recentSeasons()])]
                .sort().reverse()
                .map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="b-field">
            <label className="b-label" htmlFor={`${idPrefix}-matchday`}>Spieltag</label>
            <input
              id={`${idPrefix}-matchday`}
              className="b-input"
              type="number"
              inputMode="numeric"
              min="1"
              max={MAX_MATCHDAY}
              placeholder="—"
              {...feld('matchday')}
            />
          </div>
        </div>
      </fieldset>

      <div className="b-field">
        <span className="b-label">Sichtbarkeit</span>
        <div className="b-chips">
          {[
            { value: 'public', label: 'Öffentlich' },
            { value: 'internal', label: 'Nur intern' },
          ].map(option => (
            <button
              key={option.value}
              type="button"
              className={`b-chip${werte.visibility === option.value ? ' --is-active' : ''}`}
              aria-pressed={werte.visibility === option.value}
              onClick={() => setzen('visibility', option.value)}
            >
              <span className="b-chip__label">{option.label}</span>
            </button>
          ))}
        </div>
        <p className="b-copy" style={{ marginTop: 'var(--space-3xs)' }}>
          {werte.visibility === 'internal'
            ? 'Nur für angemeldete Redaktionskonten — taucht in der öffentlichen Mediathek nicht auf.'
            : 'Für alle Besucherinnen und Besucher sichtbar.'}
        </p>
      </div>
    </>
  );
}
