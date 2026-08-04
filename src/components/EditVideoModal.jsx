import React, { useState, useEffect } from 'react';
import Icon from './ui/Icon';
import VideoMetaFields from './ui/VideoMetaFields';
import { CATEGORIES } from '../constants/categories';

/**
 * Angaben zu einem bereits veröffentlichten Video ändern.
 *
 * Bewusst nur die Metadaten: Datei, Aufrufe und Aufbereitungsstand gehören dem
 * Server. Wer die Videodatei tauschen will, lädt neu hoch — sonst müsste die
 * Aufbereitung mitten im Betrieb neu anlaufen und der alte Stand wäre
 * unauffindbar.
 */
export default function EditVideoModal({ video, authToken, onClose, onSaved }) {
  const [meta, setMeta] = useState({
    title: video.title || '',
    description: video.description || '',
    category: video.category && video.category !== 'General' ? video.category : CATEGORIES[0].value,
    visibility: video.visibility === 'internal' ? 'internal' : 'public',
    team: video.team || '',
    competition: video.competition || '',
    season: video.season || '',
    matchday: video.matchday || '',
    tags: video.tags || '',
  });
  const setzen = (name, wert) => setMeta(m => ({ ...m, [name]: wert }));

  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !speichert) onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, speichert]);

  const speichern = async (e) => {
    e.preventDefault();
    if (!meta.title.trim()) { setFehler('Ein Titel ist erforderlich.'); return; }

    setSpeichert(true);
    setFehler('');
    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ ...meta, matchday: meta.matchday === '' ? 0 : Number(meta.matchday) }),
      });
      const daten = await res.json();
      if (!res.ok) throw new Error(daten.error || 'Änderungen konnten nicht gespeichert werden.');
      onSaved?.(daten);
      onClose?.();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setSpeichert(false);
    }
  };

  return (
    <div className="b-modal" role="dialog" aria-modal="true" aria-label="Video bearbeiten">
      <form className="b-modal__dialog" onSubmit={speichern}>
        <div className="b-modal__header">
          <div style={{ minWidth: 0 }}>
            <h2 className="b-heading b-heading--500">Video bearbeiten</h2>
            <p className="b-meta-line__item">{video.title}</p>
          </div>
          <button
            type="button"
            className="b-button b-button--ghost b-button--s"
            onClick={onClose}
            disabled={speichert}
            aria-label="Schließen"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="b-modal__body">
          <VideoMetaFields werte={meta} setzen={setzen} idPrefix="edit" />

          {fehler && <div className="b-notice b-notice--error">{fehler}</div>}

          <div className="b-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="b-button b-button--secondary b-button--s"
              onClick={onClose} disabled={speichert}>
              Abbrechen
            </button>
            <button type="submit" className="b-button b-button--primary b-button--s" disabled={speichert}>
              {speichert ? 'Wird gespeichert…' : 'Speichern'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
