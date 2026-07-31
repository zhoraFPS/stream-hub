import React, { useState, useRef } from 'react';
import { X, UploadCloud, Film, Image as ImageIcon, Camera, Loader2, Smartphone } from 'lucide-react';

// VfL Bochum TV – Kategorien (Strictly Emoji-Free)
const CATEGORIES = [
  { value: 'Spiele',           label: 'Spiele (Freundschaft / Test)' },
  { value: 'Interviews',       label: 'Interviews' },
  { value: 'Training',         label: 'Training' },
  { value: 'Highlights',       label: 'Highlights' },
  { value: 'Hinter_Kulissen',  label: 'Behind the Scenes' },
  { value: 'News',             label: 'News & Berichte' },
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Video hochladen</h2>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 2, textTransform: 'uppercase' }}>VfL Bochum TV – Media Manager</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Drop zone */}
          {!videoFile ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? 'var(--accent)' : 'var(--border)'}`,
                padding: '36px 20px', textAlign: 'center',
                background: dragActive ? 'rgba(0,85,184,0.06)' : 'var(--bg-surface)',
                transition: 'all 0.15s', cursor: 'pointer',
              }}
              onClick={() => videoInputRef.current?.click()}
            >
              <UploadCloud style={{ width: 36, height: 36, color: 'var(--accent)', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 6, textTransform: 'uppercase' }}>Video hier ablegen oder klicken</p>
              <p style={{ fontSize: 11, color: '#64748b' }}>MP4, WebM, MKV, MOV – bis 10 GB</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); videoInputRef.current?.click(); }}
                  className="btn-primary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Film size={14} /> DATEI WÄHLEN
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                  className="btn-secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Smartphone size={14} /> KAMERA / HANDY
                </button>
              </div>
              <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }}
                onChange={e => handleVideoSelect(e.target.files?.[0])} />
              <input ref={cameraInputRef} type="file" accept="video/*" capture="environment" style={{ display: 'none' }}
                onChange={e => handleVideoSelect(e.target.files?.[0])} />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(0,85,184,0.1)', border: '1px solid var(--accent)' }}>
              <Film style={{ width: 20, height: 20, color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videoFile.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{(videoFile.size / (1024 ** 2)).toFixed(1)} MB</div>
              </div>
              <button onClick={() => { setVideoFile(null); setAutoThumbnailData(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* Thumbnail preview */}
          {thumbPreview && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase' }}>
                <ImageIcon size={13} />
                {isCapturingThumb ? 'Vorschau wird generiert…' : 'Vorschaubild'}
              </p>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={thumbPreview} alt="Thumbnail" style={{ width: 200, height: 112, objectFit: 'cover', border: '1px solid var(--border)' }} />
                <button onClick={() => thumbInputRef.current?.click()}
                  style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.85)', border: '1px solid var(--border)', padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
                  <Camera size={12} /> Ändern
                </button>
                <input ref={thumbInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => setThumbnailFile(e.target.files?.[0])} />
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>Titel *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="z. B. Freundschaftsspiel VfL Bochum vs. Schalke 04"
              className="input-search"
              style={{ width: '100%' }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>Beschreibung</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung des Videos…"
              rows={3}
              className="input-search"
              style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>Kategorie</label>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>
                <span>Hochladen…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div style={{ height: '100%', background: 'var(--accent)', width: `${uploadProgress}%`, transition: 'width 0.2s' }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button onClick={onClose} disabled={isUploading} className="btn-secondary" style={{ fontSize: 12 }}>ABBRECHEN</button>
            <button
              onClick={handleUpload}
              disabled={!videoFile || isUploading}
              className="btn-primary"
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, opacity: (!videoFile || isUploading) ? 0.5 : 1 }}
            >
              {isUploading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> WIRD HOCHGELADEN…</> : <><UploadCloud size={14} /> HOCHLADEN</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
