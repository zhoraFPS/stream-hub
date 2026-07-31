import React, { useState, useRef } from 'react';

const CATEGORIES = [
  { value: 'Spiele',           label: 'SPIELE (FREUNDSCHAFT / TEST)' },
  { value: 'Interviews',       label: 'INTERVIEWS' },
  { value: 'Training',         label: 'TRAINING' },
  { value: 'Highlights',       label: 'HIGHLIGHTS' },
  { value: 'Hinter_Kulissen',  label: 'BEHIND THE SCENES' },
  { value: 'News',             label: 'NEWS & BERICHTE' },
];

export default function UploadModal({ isOpen, onClose, onUploadComplete }) {
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [autoThumbnailData, setAutoThumbnailData] = useState(null);
  const [isCapturingThumb, setIsCapturingThumb] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Spiele');
  const [tags, setTags] = useState('VfL Bochum');
  const [duration, setDuration] = useState(0);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const videoInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const thumbInputRef = useRef(null);

  if (!isOpen) return null;

  const handleVideoSelect = (file) => {
    if (!file || !file.type.startsWith('video/')) {
      alert('Bitte wähle eine gültige Videodatei (.mp4, .webm, .mkv, .mov).');
      return;
    }

    setVideoFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '') || 'VfL Bochum Video');
    }
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
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAutoThumbnailData(dataUrl);
        URL.revokeObjectURL(videoUrl);
      } catch {
        // canvas tainted – ignore
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
    const file = e.dataTransfer.files?.[0];
    if (file) handleVideoSelect(file);
  };

  const handleUpload = async () => {
    if (!videoFile) return;
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('title', title || videoFile.name);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('tags', tags);
    formData.append('duration', String(duration));

    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    } else if (autoThumbnailData) {
      formData.append('customThumbnailData', autoThumbnailData);
    }

    const token = localStorage.getItem('streamhub_token');

    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload fehlgeschlagen: ${xhr.statusText}`));
        xhr.onerror = () => reject(new Error('Netzwerkfehler'));
        xhr.send(formData);
      });

      onUploadComplete?.();
      onClose();
    } catch (err) {
      alert('Upload fehlgeschlagen: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const thumbPreview = thumbnailFile
    ? URL.createObjectURL(thumbnailFile)
    : autoThumbnailData || null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>VIDEO HOCHLADEN</h2>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>VfL Bochum 1848 TV – Media Manager</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 12, fontWeight: 900 }}>
            SCHLIESSEN
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Drop zone */}
          {!videoFile ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`,
                padding: '40px 20px', textAlign: 'center',
                background: dragActive ? 'rgba(0,85,184,0.1)' : 'rgba(255,255,255,0.03)',
                transition: 'all 0.15s', cursor: 'pointer',
              }}
              onClick={() => videoInputRef.current?.click()}
            >
              <p style={{ fontSize: 14, fontWeight: 900, color: '#ffffff', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>VIDEO HIER ABLEGEN ODER KLICKEN</p>
              <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>MP4, WebM, MKV, MOV – bis 10 GB</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); videoInputRef.current?.click(); }}
                  className="btn-primary" style={{ fontSize: 11 }}>
                  DATEI WÄHLEN
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                  className="btn-secondary" style={{ fontSize: 11 }}>
                  KAMERA / HANDY
                </button>
              </div>
              <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }}
                onChange={e => handleVideoSelect(e.target.files?.[0])} />
              <input ref={cameraInputRef} type="file" accept="video/*" capture="environment" style={{ display: 'none' }}
                onChange={e => handleVideoSelect(e.target.files?.[0])} />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(0,85,184,0.15)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{videoFile.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{(videoFile.size / (1024 ** 2)).toFixed(1)} MB</div>
              </div>
              <button onClick={() => { setVideoFile(null); setAutoThumbnailData(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 11, fontWeight: 900 }}>
                ENTFERNEN
              </button>
            </div>
          )}

          {/* Thumbnail preview */}
          {thumbPreview && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 900, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {isCapturingThumb ? 'VORSCHAU WIRD GENERIERT...' : 'VORSCHAUBILD'}
              </p>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={thumbPreview} alt="Thumbnail" style={{ width: 200, height: 112, objectFit: 'cover' }} />
                <button onClick={() => thumbInputRef.current?.click()}
                  style={{ position: 'absolute', bottom: 6, right: 6, background: '#000', border: 'none', padding: '4px 8px', fontSize: 10, fontWeight: 900, color: '#ffffff', cursor: 'pointer', textTransform: 'uppercase' }}>
                  ÄNDERN
                </button>
                <input ref={thumbInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => setThumbnailFile(e.target.files?.[0])} />
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label style={labelStyle}>TITEL *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="z. B. FREUNDSCHAFTSSPIEL VFL BOCHUM VS. SCHALKE 04"
              className="input-search"
              style={{ width: '100%' }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>BESCHREIBUNG</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung des Videos…"
              rows={3}
              className="input-search"
              style={{ width: '100%', resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>KATEGORIE</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="input-search"
              style={{ width: '100%' }}
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 900, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>
                <span>HOCHLADEN…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.1)' }}>
                <div style={{ height: '100%', background: 'var(--accent)', width: `${uploadProgress}%`, transition: 'width 0.2s' }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
            <button onClick={onClose} disabled={isUploading} className="btn-secondary" style={{ fontSize: 11 }}>ABBRECHEN</button>
            <button
              onClick={handleUpload}
              disabled={!videoFile || isUploading}
              className="btn-primary"
              style={{ fontSize: 11, opacity: (!videoFile || isUploading) ? 0.5 : 1 }}
            >
              {isUploading ? 'WIRD HOCHGELADEN...' : 'HOCHLADEN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 800,
  color: '#64748b',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};
