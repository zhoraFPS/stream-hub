import React, { useRef, useState, useEffect } from 'react';

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 3600) return 'GERADE EBEN';
  const hours = Math.floor(diff / 3600);
  if (hours < 24) return `VOR ${hours} STD.`;
  const days = Math.floor(hours / 24);
  return `VOR ${days} TAGEN`;
}

export default function VideoPlayer({ video, allVideos, onSelectVideo, onBack, onLike, onAddComment, systemInfo, onOpenChannel }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [commentUser, setCommentUser] = useState('');
  const [commentText, setCommentText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [comments, setComments] = useState(video.comments || []);
  const [likeCount, setLikeCount] = useState(video.likes || 0);

  const uploaderName = video.display_name || video.username || video.uploader || 'VfL Redaktion';
  const uploaderUsername = video.username || 'vflbochum';
  const avatarUrl = video.avatar_url;

  const streamUrl = video.videoUrl && video.videoUrl.startsWith('http')
    ? video.videoUrl
    : `/api/videos/${video.id}/stream`;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [video.id]);

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/#watch=${video.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleLike = () => {
    setLikeCount(c => c + 1);
    if (onLike) onLike(video.id);
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const newComment = {
      id: 'c-' + Date.now(),
      user: commentUser.trim() || 'ZUSCHAUER',
      text: commentText.trim(),
      date: new Date().toISOString()
    };
    setComments(prev => [newComment, ...prev]);
    if (onAddComment) onAddComment(video.id, newComment.user, newComment.text);
    setCommentText('');
  };

  const recommendedVideos = (allVideos || []).filter(v => v.id !== video.id);

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '16px 20px 48px' }}>
      
      {/* Back button */}
      <div style={{ paddingBottom: 16 }}>
        <button onClick={onBack} className="btn-secondary" style={{ fontSize: 11 }}>
          ← ZURÜCK ZUR VOD-ÜBERSICHT
        </button>
      </div>

      {/* Main 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }} className="live-layout-grid">
        
        {/* Left Column: Player & Video Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          
          {/* Cinema Player Container */}
          <div ref={containerRef} style={{ position: 'relative', background: '#000', overflow: 'hidden', aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              src={streamUrl}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3 }}>
            {video.title}
          </h1>

          {/* Channel Card & Actions Row */}
          <div style={{ padding: '16px 20px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            
            {/* Channel Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                onClick={() => onOpenChannel && onOpenChannel(uploaderUsername)}
                style={{ width: 44, height: 44, background: '#0055b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#ffffff', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  uploaderName[0].toUpperCase()
                )}
              </div>
              <div>
                <div
                  onClick={() => onOpenChannel && onOpenChannel(uploaderUsername)}
                  style={{ fontSize: 14, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', cursor: 'pointer' }}>
                  {uploaderName}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginTop: 2 }}>
                  @{uploaderUsername} · VFL REDAKTION
                </div>
              </div>
              {onOpenChannel && (
                <button
                  onClick={() => onOpenChannel(uploaderUsername)}
                  className="btn-primary"
                  style={{ fontSize: 10, padding: '6px 12px', marginLeft: 8 }}>
                  KANAL BESUCHEN
                </button>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={handleLike} className="btn-secondary" style={{ fontSize: 11 }}>
                GEFÄLLT MIR ({likeCount})
              </button>
              <button onClick={handleCopyLink} className="btn-secondary" style={{ fontSize: 11 }}>
                {copiedLink ? 'LINK KOPIERT' : 'TEILEN'}
              </button>
              <a href={streamUrl} download className="btn-secondary" style={{ fontSize: 11 }}>
                HERUNTERLADEN
              </a>
            </div>
          </div>

          {/* Description Box */}
          <div style={{ padding: '16px 20px', background: 'var(--bg-card)', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>
              <span>{video.views || 0} AUFRUFE</span>
              <span>•</span>
              <span>{formatRelativeTime(video.createdAt || video.created_at)}</span>
              <span>•</span>
              <span style={{ color: '#0055b8' }}>{video.category || 'General'}</span>
            </div>
            <p style={{ color: '#ffffff', whiteSpace: 'pre-line', fontSize: 13 }}>
              {video.description || 'Keine Beschreibung vorhanden.'}
            </p>
          </div>

          {/* Comments Section */}
          <div style={{ padding: '20px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              KOMMENTARE ({comments.length})
            </div>

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                placeholder="DEIN NAME (OPTIONAL)"
                value={commentUser}
                onChange={e => setCommentUser(e.target.value)}
                className="input-search"
                style={{ width: '100%', fontSize: 11, textTransform: 'uppercase' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="KOMMENTAR SCHREIBEN…"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="input-search"
                  style={{ flex: 1, fontSize: 12 }}
                />
                <button type="submit" className="btn-primary" style={{ fontSize: 11, padding: '8px 16px', flexShrink: 0 }}>
                  ABSENDEN
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {comments.length > 0 ? (
                comments.map(c => (
                  <div key={c.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', fontSize: 12, lineHeight: 1.4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 900, color: '#0055b8', textTransform: 'uppercase' }}>{c.user}</span>
                      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>{formatRelativeTime(c.date)}</span>
                    </div>
                    <p style={{ color: '#ffffff' }}>{c.text}</p>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', textTransform: 'uppercase' }}>Noch keine Kommentare vorhanden.</p>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Recommended VODs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            WEITERE VODS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recommendedVideos.length > 0 ? (
              recommendedVideos.map(rec => (
                <div
                  key={rec.id}
                  onClick={() => onSelectVideo(rec)}
                  className="video-card"
                  style={{ display: 'flex', gap: 10, padding: 8 }}
                >
                  <div style={{ width: 120, aspectRatio: '16/9', background: '#000', position: 'relative', flexShrink: 0 }}>
                    <img src={rec.thumbnailUrl || rec.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div className="badge-duration">{formatDuration(rec.duration)}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, padding: '2px 0' }}>
                    <h4 style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3, textTransform: 'uppercase' }}>
                      {rec.title}
                    </h4>
                    <p style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: 700, textTransform: 'uppercase' }}>
                      {rec.display_name || rec.username || rec.uploader || 'VfL Redaktion'}
                    </p>
                    <p style={{ fontSize: 10, color: '#475569', marginTop: 2, fontWeight: 700 }}>
                      {rec.views || 0} AUFRUFE
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Keine weiteren VODs.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
