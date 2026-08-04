export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const sec = Math.floor(seconds);
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;

  const pad = (num) => String(num).padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${mins}:${pad(secs)}`;
}

/**
 * „1 Aufruf" statt „1 Aufrufe" — und deutsche Tausenderpunkte statt der
 * englischen K-Abkürzung, die auf einer deutschen Vereinsseite fremd wirkt.
 */
export function formatViews(views) {
  const n = Number(views) || 0;
  if (n === 1) return '1 Aufruf';
  if (n >= 1000000) return `${(n / 1000000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. Aufrufe`;
  return `${n.toLocaleString('de-DE')} Aufrufe`;
}

export function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Gerade eben';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `vor ${days} Tagen`;
  const months = Math.floor(days / 30);
  if (months < 12) return `vor ${months} Mon.`;
  const years = Math.floor(months / 12);
  return `vor ${years} Jahren`;
}

/** Datumsformat der Meta-Zeilen auf vfl-bochum.de: 03.08.2026 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
