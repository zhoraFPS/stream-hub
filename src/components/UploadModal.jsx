import React, { useState, useRef, useEffect } from 'react';
import Icon from './ui/Icon';
import { CATEGORIES, TEAMS, COMPETITIONS, MAX_MATCHDAY, recentSeasons } from '../constants/categories';
import { formatBytes } from '../utils/formatters';

export default function UploadModal({ isOpen, onClose, onUploadComplete }) {
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [autoThumbnailData, setAutoThumbnailData] = useState(null);
  const [isCapturingThumb, setIsCapturingThumb] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [visibility, setVisibility] = useState('public');
  const [team, setTeam] = useState('');
  const [competition, setCompetition] = useState('');
  const [season, setSeason] = useState('');
  const [matchday, setMatchday] = useState('');
  const [tags, setTags] = useState('VfL Bochum');
  const [duration, setDuration] = useState(0);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const videoInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const thumbInputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !isUploading) onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, isUploading]);

  if (!isOpen) return null;

  const handleVideoSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Das ist keine Videodatei. Erlaubt sind MP4, WebM, MKV und MOV.');
      return;
    }
    setError('');
    setVideoFile(file);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    setIsCapturingThumb(true);

    const videoUrl = URL.createObjectURL(file);
    const videoEl = document.createElement('video');
    videoEl.src = videoUrl;
    videoEl.muted = true;
    videoEl.playsInline = true;

    videoEl.onloadedmetadata = () => {
      setDuration(videoEl.duration);
      videoEl.currentTime = Math.min(2.0, (videoEl.duration || 4) / 2);
    };

    videoEl.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        setAutoThumbnailData(canvas.toDataURL('image/jpeg', 0.85));
        URL.revokeObjectURL(videoUrl);
      } catch {
        // Canvas ist bei manchen Quellen gesperrt — dann ohne Vorschaubild weiter.
      } finally {
        setIsCapturingThumb(false);
      }
    };

    videoEl.onerror = () => { setIsCapturingThumb(false); URL.revokeObjectURL(videoUrl); };
    videoEl.load();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleVideoSelect(e.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!videoFile) return;
    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('title', title || videoFile.name);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('visibility', visibility);
    formData.append('team', team);
    formData.append('competition', competition);
    formData.append('season', season);
    formData.append('matchday', matchday);
    formData.append('tags', tags);
    formData.append('duration', String(duration));

    if (thumbnailFile) formData.append('thumbnail', thumbnailFile);
    else if (autoThumbnailData) formData.append('customThumbnailData', autoThumbnailData);

    const token = localStorage.getItem('streamhub_token');

    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300)
          ? resolve()
          : reject(new Error(`Der Server hat den Upload abgelehnt (${xhr.status}).`));
        xhr.onerror = () => reject(new Error('Die Verbindung ist abgebrochen.'));
        xhr.send(formData);
      });

      onUploadComplete?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const thumbPreview = thumbnailFile ? URL.createObjectURL(thumbnailFile) : autoThumbnailData;

  return (
    <div className="b-modal" role="dialog" aria-modal="true" aria-label="Video hochladen">
      <div className="b-modal__dialog">
        <div className="b-modal__header">
          <div>
            <h2 className="b-heading b-heading--500">Video hochladen</h2>
            <p className="b-meta-line__item">1848TV Mediathek</p>
          </div>
          <button type="button" className="b-button b-button--ghost b-button--s"
            onClick={onClose} disabled={isUploading} aria-label="Schließen">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="b-modal__body">
          {!videoFile ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => videoInputRef.current?.click()}
              style={{
                border: `1px dashed ${dragActive ? 'var(--color-front)' : 'var(--color-line)'}`,
                background: dragActive ? 'var(--color-alpha-100)' : 'transparent',
                padding: 'var(--space-l) var(--space-s)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'background-color .2s ease, border-color .2s ease',
              }}
            >
              <p className="b-heading b-heading--200">Datei hierher ziehen</p>
              <p className="b-meta-line__item" style={{ display: 'block', marginBlock: 'var(--space-3xs) var(--space-s)' }}>
                MP4, WebM, MKV, MOV — bis 10 GB
              </p>
              <div className="b-row" style={{ justifyContent: 'center' }}>
                <button type="button" className="b-button b-button--primary b-button--s"
                  onClick={(e) => { e.stopPropagation(); videoInputRef.current?.click(); }}>
                  Datei wählen
                </button>
                <button type="button" className="b-button b-button--secondary b-button--s"
                  onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                  Mit Kamera aufnehmen
                </button>
              </div>
              <input ref={videoInputRef} type="file" accept="video/*" hidden
                onChange={e => handleVideoSelect(e.target.files?.[0])} />
              <input ref={cameraInputRef} type="file" accept="video/*" capture="environment" hidden
                onChange={e => handleVideoSelect(e.target.files?.[0])} />
            </div>
          ) : (
            <div className="b-panel b-panel--bare" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="b-heading b-heading--200 b-truncate b-truncate--1">{videoFile.name}</div>
                <span className="b-meta-line__item">{formatBytes(videoFile.size)}</span>
              </div>
              <button type="button" className="b-button b-button--ghost b-button--s"
                onClick={() => { setVideoFile(null); setAutoThumbnailData(null); setThumbnailFile(null); }}
                disabled={isUploading}>
                Entfernen
              </button>
            </div>
          )}

          {thumbPreview && (
            <div className="b-field">
              <span className="b-label">
                {isCapturingThumb ? 'Vorschaubild wird erzeugt' : 'Vorschaubild'}
              </span>
              <div style={{ position: 'relative', width: 220 }}>
                <img src={thumbPreview} alt="" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />
                <button type="button" className="b-button b-button--ghost b-button--s"
                  style={{ position: 'absolute', bottom: 0, right: 0 }}
                  onClick={() => thumbInputRef.current?.click()}>
                  Ändern
                </button>
                <input ref={thumbInputRef} type="file" accept="image/*" hidden
                  onChange={e => setThumbnailFile(e.target.files?.[0])} />
              </div>
            </div>
          )}

          <div className="b-field">
            <label className="b-label" htmlFor="up-title">Titel</label>
            <input id="up-title" className="b-input" type="text" value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Testspiel VfL Bochum 1848 gegen Swansea City" />
          </div>

          <div className="b-field">
            <label className="b-label" htmlFor="up-desc">Beschreibung</label>
            <textarea id="up-desc" className="b-input" rows={3} value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Worum geht es in diesem Video?" />
          </div>

          <div className="b-field">
            <label className="b-label" htmlFor="up-cat">Kategorie</label>
            <select id="up-cat" className="b-input" value={category} onChange={e => setCategory(e.target.value)}>
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
                <label className="b-label" htmlFor="up-team">Mannschaft</label>
                <select id="up-team" className="b-input" value={team} onChange={e => setTeam(e.target.value)}>
                  <option value="">—</option>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="b-field">
                <label className="b-label" htmlFor="up-comp">Wettbewerb</label>
                <select id="up-comp" className="b-input" value={competition} onChange={e => setCompetition(e.target.value)}>
                  <option value="">—</option>
                  {COMPETITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="b-field">
                <label className="b-label" htmlFor="up-season">Saison</label>
                <select id="up-season" className="b-input" value={season} onChange={e => setSeason(e.target.value)}>
                  <option value="">—</option>
                  {recentSeasons().map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="b-field">
                <label className="b-label" htmlFor="up-matchday">Spieltag</label>
                <input
                  id="up-matchday" className="b-input" type="number" inputMode="numeric"
                  min="1" max={MAX_MATCHDAY} placeholder="—"
                  value={matchday} onChange={e => setMatchday(e.target.value)}
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
                  className={`b-chip${visibility === option.value ? ' --is-active' : ''}`}
                  aria-pressed={visibility === option.value}
                  onClick={() => setVisibility(option.value)}
                >
                  <span className="b-chip__label">{option.label}</span>
                </button>
              ))}
            </div>
            <p className="b-copy" style={{ marginTop: 'var(--space-3xs)' }}>
              {visibility === 'public'
                ? 'Für alle Besucherinnen und Besucher sichtbar.'
                : 'Nur für angemeldete Redaktionskonten — taucht in der öffentlichen Mediathek nicht auf.'}
            </p>
          </div>

          {isUploading && (
            <div className="b-field">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="b-label">Wird hochgeladen</span>
                <span className="b-label">{uploadProgress}%</span>
              </div>
              <div className="b-progress">
                <div className="b-progress__bar" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {error && <div className="b-notice b-notice--error">{error}</div>}

          <div className="b-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="b-button b-button--secondary b-button--s"
              onClick={onClose} disabled={isUploading}>
              Abbrechen
            </button>
            <button type="button" className="b-button b-button--primary b-button--s"
              onClick={handleUpload} disabled={!videoFile || isUploading}>
              {isUploading ? 'Wird hochgeladen…' : 'Veröffentlichen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
