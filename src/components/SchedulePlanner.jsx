import React, { useState, useEffect, useCallback } from 'react';
import SectionTitle from './ui/SectionTitle';
import { TEAMS, COMPETITIONS, MAX_MATCHDAY, recentSeasons, matchLabel } from '../constants/categories';

/**
 * Übertragungen ankündigen.
 *
 * Zwei Zwecke: Zuschauende sehen auf der Startseite, was ansteht. Und startet
 * die Übertragung später wirklich, erbt der Mitschnitt Titel und Einordnung von
 * hier — sonst hieße jede Aufzeichnung „Aufzeichnung vom …" und müsste von Hand
 * nachgetragen werden.
 */

/** <input type="datetime-local"> erwartet Ortszeit ohne Zeitzone. */
function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date(Date.now() + 3600000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatSchedule(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' Uhr';
}

const LEER = {
  title: '', description: '', scheduledFor: '',
  team: '', competition: '', season: '', matchday: '',
};

export default function SchedulePlanner({ authToken, currentUser }) {
  const [eintraege, setEintraege] = useState([]);
  const [formular, setFormular] = useState({ ...LEER, scheduledFor: toLocalInput() });
  const [bearbeitet, setBearbeitet] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hinweis, setHinweis] = useState(null);

  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  const laden = useCallback(() => {
    fetch('/api/schedule/all', { headers: { Authorization: `Bearer ${authToken}` } })
      .then(res => res.ok ? res.json() : [])
      .then(setEintraege)
      .catch(() => {});
  }, [authToken]);

  useEffect(() => { laden(); }, [laden]);

  const sagen = (kind, text) => {
    setHinweis({ kind, text });
    setTimeout(() => setHinweis(null), 4000);
  };

  const setzen = (name, wert) => setFormular(f => ({ ...f, [name]: wert }));

  const abbrechen = () => {
    setBearbeitet(null);
    setFormular({ ...LEER, scheduledFor: toLocalInput() });
  };

  const uebernehmen = (eintrag) => {
    setBearbeitet(eintrag.id);
    setFormular({
      title: eintrag.title,
      description: eintrag.description || '',
      scheduledFor: toLocalInput(eintrag.scheduled_for),
      team: eintrag.team || '',
      competition: eintrag.competition || '',
      season: eintrag.season || '',
      matchday: eintrag.matchday || '',
    });
  };

  const speichern = async (e) => {
    e.preventDefault();
    if (!formular.title.trim()) { sagen('error', 'Ein Titel ist erforderlich.'); return; }

    setBusy(true);
    try {
      const res = await fetch(bearbeitet ? `/api/schedule/${bearbeitet}` : '/api/schedule', {
        method: bearbeitet ? 'PUT' : 'POST',
        headers,
        // datetime-local liefert Ortszeit; new Date() macht daraus den
        // richtigen Zeitpunkt, der Server speichert ihn als ISO.
        body: JSON.stringify({ ...formular, scheduledFor: new Date(formular.scheduledFor).toISOString() }),
      });
      const daten = await res.json();
      if (!res.ok) throw new Error(daten.error || 'Speichern fehlgeschlagen.');
      sagen('success', bearbeitet ? 'Ankündigung geändert.' : 'Übertragung angekündigt.');
      abbrechen();
      laden();
    } catch (err) {
      sagen('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const entfernen = async (eintrag) => {
    if (!confirm(`Ankündigung „${eintrag.title}" löschen?`)) return;
    const res = await fetch(`/api/schedule/${eintrag.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) sagen('error', (await res.json()).error);
    if (bearbeitet === eintrag.id) abbrechen();
    laden();
  };

  const STATUS = { planned: 'Angekündigt', live: 'Läuft', done: 'Beendet', cancelled: 'Abgesagt' };

  return (
    <section className="b-section">
      <SectionTitle title="Übertragungen" count={eintraege.length} />

      <div className="b-panel b-panel--l" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
        {hinweis && <div className={`b-notice b-notice--${hinweis.kind}`}>{hinweis.text}</div>}

        {eintraege.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' }}>
            {eintraege.map(eintrag => {
              const meins = eintrag.user_id === currentUser?.id || currentUser?.role === 'admin';
              return (
                <div key={eintrag.id} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-s)', flexWrap: 'wrap',
                  paddingBlock: 'var(--space-2xs)', borderBottom: '1px solid var(--color-line)',
                }}>
                  <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                    <div className="b-heading b-heading--200">{eintrag.title}</div>
                    <div className="b-meta-line">
                      <span className="b-meta-line__item">{formatSchedule(eintrag.scheduled_for)}</span>
                      <span className="b-meta-line__item">{STATUS[eintrag.status] || eintrag.status}</span>
                      {matchLabel(eintrag) && <span className="b-meta-line__item">{matchLabel(eintrag)}</span>}
                    </div>
                  </div>
                  {meins && (
                    <div className="b-row">
                      <button type="button" className="b-button b-button--ghost b-button--s"
                        onClick={() => uebernehmen(eintrag)}>
                        Ändern
                      </button>
                      <button type="button" className="b-button b-button--ghost b-button--s"
                        onClick={() => entfernen(eintrag)}>
                        Löschen
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={speichern} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' }}>
          <span className="b-label">
            {bearbeitet ? 'Ankündigung ändern' : 'Übertragung ankündigen'}
          </span>

          <div className="b-field">
            <label className="b-label" htmlFor="plan-title">Titel</label>
            <input id="plan-title" className="b-input" required
              placeholder="Testspiel VfL Bochum 1848 gegen Swansea City"
              value={formular.title} onChange={e => setzen('title', e.target.value)} />
          </div>

          <div className="b-field">
            <label className="b-label" htmlFor="plan-when">Beginn</label>
            <input id="plan-when" className="b-input" type="datetime-local" required
              value={formular.scheduledFor} onChange={e => setzen('scheduledFor', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-2xs)' }}>
            <div className="b-field">
              <label className="b-label" htmlFor="plan-team">Mannschaft</label>
              <select id="plan-team" className="b-input" value={formular.team} onChange={e => setzen('team', e.target.value)}>
                <option value="">—</option>
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="b-field">
              <label className="b-label" htmlFor="plan-comp">Wettbewerb</label>
              <select id="plan-comp" className="b-input" value={formular.competition} onChange={e => setzen('competition', e.target.value)}>
                <option value="">—</option>
                {COMPETITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="b-field">
              <label className="b-label" htmlFor="plan-season">Saison</label>
              <select id="plan-season" className="b-input" value={formular.season} onChange={e => setzen('season', e.target.value)}>
                <option value="">—</option>
                {recentSeasons().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="b-field">
              <label className="b-label" htmlFor="plan-matchday">Spieltag</label>
              <input id="plan-matchday" className="b-input" type="number" min="1" max={MAX_MATCHDAY} placeholder="—"
                value={formular.matchday} onChange={e => setzen('matchday', e.target.value)} />
            </div>
          </div>

          <p className="b-copy">
            Startet die Übertragung im Umkreis von sechs Stunden um diesen Zeitpunkt,
            übernimmt der Mitschnitt Titel und Einordnung von hier.
          </p>

          <div className="b-row">
            <button type="submit" className="b-button b-button--primary b-button--s" disabled={busy}>
              {busy ? 'Wird gespeichert…' : bearbeitet ? 'Änderung speichern' : 'Ankündigen'}
            </button>
            {bearbeitet && (
              <button type="button" className="b-button b-button--secondary b-button--s" onClick={abbrechen}>
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
