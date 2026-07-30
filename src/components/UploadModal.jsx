import React, { useState, useRef } from 'react';
import { X, UploadCloud, Film, Image as ImageIcon, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [autoThumbnailData, setAutoThumbnailData] = useState(null);
  const [isCapturingThumb, setIsCapturingThumb] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [tags, setTags] = useState('');
  const [duration, setDuration] = useState(0);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const videoInputRef = useRef(null);
  const thumbInputRef = useRef(null);

  if (!isOpen) return null;

  // Handle Video Selection & Auto Frame Snapshot
  const handleVideoSelect = (file) => {
    if (!file || !file.type.startsWith('video/')) {
      alert('Bitte wähle eine gültige Videodatei (.mp4, .webm, .mkv).');
      return;
    }

    setVideoFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, '')); // Auto title from filename
    setIsCapturingThumb(true);

    // Create hidden video element to capture snapshot frame at second 2
    const videoUrl = URL.createObjectURL(file);
    const videoEl = document.createElement('video');
    videoEl.src = videoUrl;
    videoEl.muted = true;
    videoEl.playsInline = true;

    videoEl.onloadedmetadata = () => {
      setDuration(videoEl.duration);
      videoEl.currentTime = Math.min(2.0, videoEl.duration / 2);
    };

    videoEl.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth || 1280;
        canvas.height = videoEl.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAutoThumbnailData(dataUrl);
      } catch (err) {
        console.error('Frame capture failed:', err);
      } finally {
        setIsCapturingThumb(false);
        URL.revokeObjectURL(videoUrl);
      }
    };
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleVideoSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile) return;

    setIsUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('tags', tags);
    formData.append('duration', duration);

    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    } else if (autoThumbnailData) {
      formData.append('customThumbnailData', autoThumbnailData);
    }

    try {
      setUploadProgress(40);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(80);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload fehlgeschlagen');
      }

      const newVideo = await res.json();
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        onUploadSuccess(newVideo);
        onClose();
      }, 500);
    } catch (err) {
      alert('Fehler beim Upload: ' + err.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/15 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-lg text-white">Neues VOD auf Proxmox Hochladen</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          
          {/* File Dropzone */}
          {!videoFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => videoInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-white/15 hover:border-white/30 bg-white/[0.02]'
              }`}
            >
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleVideoSelect(e.target.files[0])}
              />
              <UploadCloud className="w-12 h-12 mx-auto text-red-500 mb-3 animate-bounce" />
              <p className="font-semibold text-white text-base">
                Videodatei hierhin ziehen oder klicken
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Unterstützt MP4, WebM, MKV (bis 10 GB für lokales Streaming)
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Film className="w-8 h-8 text-red-500" />
                <div>
                  <p className="font-semibold text-white text-sm">{videoFile.name}</p>
                  <p className="text-xs text-gray-400">
                    {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVideoFile(null);
                  setAutoThumbnailData(null);
                }}
                className="text-xs text-red-400 hover:underline"
              >
                Ändern
              </button>
            </div>
          )}

          {/* Thumbnail Preview / Custom Thumbnail */}
          {videoFile && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 block">
                Video Thumbnail Preview (Automatisch generiert)
              </label>
              <div className="flex gap-4 items-center">
                <div className="w-40 aspect-video rounded-xl bg-black overflow-hidden border border-white/15 relative">
                  {isCapturingThumb ? (
                    <div className="inset-0 flex items-center justify-center text-xs text-gray-400 gap-1">
                      <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                      Frame Snapshot...
                    </div>
                  ) : autoThumbnailData ? (
                    <img src={autoThumbnailData} alt="Snapshot" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-xs text-gray-500 p-2 text-center">Standart-Thumbnail</div>
                  )}
                </div>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => thumbInputRef.current?.click()}
                    className="btn-secondary text-xs flex items-center gap-2"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    Eigenes Bild hochladen
                  </button>
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setThumbnailFile(e.target.files[0]);
                        setAutoThumbnailData(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                  />
                  <p className="text-[11px] text-gray-400">Standardmäßig Frame bei 00:02.</p>
                </div>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Titel</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Video Titel eingeben..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Kategorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                >
                  <option value="Movies">Filme & Clips</option>
                  <option value="Gaming">Gaming Streams</option>
                  <option value="Tutorials">Tutorials & Tech</option>
                  <option value="Proxmox">Proxmox / NUC</option>
                  <option value="General">Sonstiges</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Tags (Kommagetrennt)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="z.B. 4K, Benchmark, NUC"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Beschreibung</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kurze Beschreibung des VODs..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 resize-none"
              />
            </div>
          </div>

          {/* Progress Bar during LAN Upload */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Upload im lokalen Netzwerk...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-sm"
              disabled={isUploading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!videoFile || isUploading}
              className="btn-primary text-sm shadow-lg disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                'VOD Speichern & Veröffentlichen'
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
