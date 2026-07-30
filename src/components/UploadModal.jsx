import React, { useState, useRef } from 'react';
import { X, UploadCloud, Film, Image as ImageIcon, Camera, Loader2, Smartphone } from 'lucide-react';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [autoThumbnailData, setAutoThumbnailData] = useState(null);
  const [isCapturingThumb, setIsCapturingThumb] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Gaming');
  const [tags, setTags] = useState('Smartphone Stream');
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
      setTitle(file.name.replace(/\.[^/.]+$/, '') || 'Handy Stream Video');
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
    setUploadProgress(15);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('title', title || 'Handy Stream VOD');
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
      setUploadProgress(50);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(90);

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
      }, 400);
    } catch (err) {
      alert('Fehler beim Upload: ' + err.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#07090e] border border-white/15 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-base text-white">VOD / Handy-Stream Hochladen</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* File Dropzone & Camera Trigger */}
          {!videoFile ? (
            <div className="space-y-3">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => videoInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-500/10'
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
                <UploadCloud className="w-10 h-10 mx-auto text-blue-400 mb-2" />
                <p className="font-bold text-white text-sm">
                  Datei auswählen oder hierher ziehen
                </p>
                <p className="text-gray-400 mt-1">
                  MP4, WebM, MOV, MKV (bis 10 GB auf NUC SSD)
                </p>
              </div>

              {/* Mobile Camera Direct Record Option */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full btn-secondary text-xs flex items-center justify-center gap-2 border-dashed border-cyan-500/40 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/15"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>📱 Mit Handy-Kamera jetzt aufnehmen & live streamen</span>
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="video/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleVideoSelect(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Film className="w-7 h-7 text-blue-400" />
                <div>
                  <p className="font-semibold text-white text-xs truncate max-w-[240px]">{videoFile.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono">
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

          {/* Thumbnail Preview */}
          {videoFile && (
            <div className="space-y-1.5">
              <label className="font-semibold text-gray-300 block text-xs">
                Auto-Thumbnail Preview (Sekunde 00:02)
              </label>
              <div className="flex gap-3 items-center">
                <div className="w-32 aspect-video rounded bg-black overflow-hidden border border-white/15 relative">
                  {isCapturingThumb ? (
                    <div className="inset-0 flex items-center justify-center text-[10px] text-gray-400 gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      Snapshot...
                    </div>
                  ) : autoThumbnailData ? (
                    <img src={autoThumbnailData} alt="Snapshot" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-[10px] text-gray-500 p-2 text-center">Thumbnail</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => thumbInputRef.current?.click()}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                  Eigenes Bild wählen
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
              </div>
            </div>
          )}

          {/* Fields */}
          <div className="space-y-3">
            <div>
              <label className="font-semibold text-gray-300 block mb-1">VOD Titel</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Video Titel..."
                className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-gray-300 block mb-1">Kategorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0e121b] border border-white/10 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                >
                  <option value="Gaming">Gaming Streams</option>
                  <option value="Movies">Filme & Clips</option>
                  <option value="Tutorials">Tutorials & Tech</option>
                  <option value="Proxmox">Proxmox / NUC</option>
                  <option value="General">Sonstiges</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-300 block mb-1">Tags</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="z.B. Handy, Live, 4K"
                  className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-gray-300 block mb-1">Beschreibung</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionale Beschreibung..."
                className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-gray-300 font-mono">
                <span>Wird an Proxmox NUC gesendet...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs"
              disabled={isUploading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!videoFile || isUploading}
              className="btn-primary text-xs shadow-md disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Übertrage...
                </>
              ) : (
                'VOD Hochladen & Live Streamen'
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
