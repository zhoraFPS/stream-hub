import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import https from 'https';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { randomUUID, randomBytes, createHmac, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ensureCertsExist } from './generate-cert.js';
import {
  getDb, createUser, getUserById, getUserByUsername, getUserByEmail,
  getUserByStreamKey, updateUserLiveStatus, updateUserProfile,
  regenerateStreamKey, getAllLiveChannels, safeUser,
  createVideo, getVideoById, getVideosByUser, getAllVideos, getTaxonomy,
  incrementVideoViews, deleteVideo, startLiveSession, endLiveSession,
  ROLES, roleAtLeast, countUsers, countAdmins, listUsers, setUserRole, deleteUser
} from './db.js';
import { enqueue as enqueueTranscode, resumePending, isFfmpegAvailable, queueState } from './transcode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Token-Signaturschlüssel.
 *
 * Vorher stand hier ein fest eingebauter Fallback. Wer den Quelltext kannte,
 * konnte damit Tokens für jeden beliebigen Account signieren — im Docker ohne
 * gesetzte JWT_SECRET-Variable also praktisch immer.
 *
 * Reihenfolge: Umgebungsvariable, sonst ein einmalig erzeugter Schlüssel in
 * server/data. Die Datei liegt im gemounteten Volume, dadurch überleben
 * Sitzungen einen Container-Neustart.
 */
function resolveJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  const secretPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', '.jwt-secret');
  try {
    if (fs.existsSync(secretPath)) {
      const stored = fs.readFileSync(secretPath, 'utf8').trim();
      if (stored) return stored;
    }
    const generated = randomBytes(48).toString('hex');
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    console.warn('[Auth] JWT_SECRET ist nicht gesetzt. Schlüssel erzeugt in server/data/.jwt-secret');
    return generated;
  } catch (err) {
    // Kein beschreibbares Volume: lieber flüchtig als vorhersagbar. Nach einem
    // Neustart müssen sich dann alle neu anmelden.
    console.warn('[Auth] Schlüssel konnte nicht gespeichert werden, nutze flüchtigen Schlüssel:', err.message);
    return randomBytes(48).toString('hex');
  }
}

const JWT_SECRET = resolveJwtSecret();

const app = express();
const PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 5443;

const httpServer = http.createServer(app);

let httpsServer = null;
const sslCerts = ensureCertsExist();
if (sslCerts && sslCerts.key && sslCerts.cert) {
  try {
    httpsServer = https.createServer({ key: sslCerts.key, cert: sslCerts.cert }, app);
  } catch (e) {
    console.log('HTTPS init warning:', e.message);
  }
}

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── File Paths ────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');
const HLS_DIR = path.join(UPLOADS_DIR, 'hls');

[DATA_DIR, UPLOADS_DIR, VIDEOS_DIR, THUMBNAILS_DIR, HLS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') cb(null, VIDEOS_DIR);
    else if (file.fieldname === 'thumbnail') cb(null, THUMBNAILS_DIR);
    else cb(new Error('Invalid field name'), null);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 * 1024 } });

// ── Auth Middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Nicht angemeldet' });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const user = getUserById(payload.userId);
    if (!user) return res.status(401).json({ error: 'Konto existiert nicht mehr' });
    req.userId = user.id;
    // Die Rolle kommt aus der Datenbank, nicht aus dem Token: sonst behielte ein
    // herabgestuftes Konto seine Rechte, bis der Token abläuft.
    req.userRole = user.role || 'viewer';
    next();
  } catch {
    res.status(401).json({ error: 'Sitzung abgelaufen' });
  }
}

/** Schranke für alles, was mehr als Zuschauen ist. */
function requireRole(minimum) {
  return (req, res, next) => requireAuth(req, res, () => {
    if (!roleAtLeast(req.userRole, minimum)) {
      return res.status(403).json({ error: 'Dafür fehlen dir die Rechte' });
    }
    next();
  });
}

/**
 * Zugriff auf Mediendateien.
 *
 * Interne Videos sollen nur die angemeldete Redaktion sehen. Der Player holt
 * Segmente und Originaldatei aber als gewöhnliche Medien-Anfragen — dort lässt
 * sich kein Authorization-Kopf mitgeben, und auf dem iPhone spielt Safari HLS
 * selbst ab, ganz ohne unser Zutun. Deshalb ein eigenes, kurzlebiges Cookie,
 * das beim Anmelden gesetzt wird; der Bearer-Token bleibt davon unberührt.
 */
const MEDIA_COOKIE = 'media_session';

function signMediaSession(userId, role, expiresAt) {
  return createHmac('sha256', JWT_SECRET).update(`${userId}.${role}.${expiresAt}`).digest('hex');
}

function issueMediaSession(res, userId, role) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
  // Die Rolle steht mit im Cookie, damit eine Segment-Anfrage keine
  // Datenbankabfrage auslöst — davon kommen bei einem Spiel tausende.
  const value = `${userId}.${role}.${expiresAt}.${signMediaSession(userId, role, expiresAt)}`;
  res.cookie(MEDIA_COOKIE, value, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

function clearMediaSession(res) {
  res.setHeader('Set-Cookie', `${MEDIA_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

/** Rolle aus dem Medien-Cookie, oder null wenn keins oder ungültig. */
function mediaSessionRole(req) {
  const raw = readCookie(req, MEDIA_COOKIE);
  if (!raw) return null;
  const [userId, role, expiresAt, signature] = raw.split('.');
  if (!userId || !role || !expiresAt || !signature) return null;
  if (Number(expiresAt) < Date.now()) return null;

  const expected = signMediaSession(userId, role, expiresAt);
  if (expected.length !== signature.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  return role;
}

/**
 * Darf dieser Abruf das Video sehen? Interne Videos sind für die Redaktion —
 * ein bloßes Zuschauerkonto reicht dafür nicht.
 */
function mayAccess(video, req) {
  if (!video) return false;
  if (video.visibility !== 'internal') return true;
  if (roleAtLeast(req.userRole, 'editor')) return true;
  return roleAtLeast(mediaSessionRole(req), 'editor');
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET);
      const user = getUserById(payload.userId);
      if (user) {
        req.userId = user.id;
        req.userRole = user.role || 'viewer';
      }
    } catch {}
  }
  next();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) return alias.address;
    }
  }
  return 'localhost';
}

// ── Static Files ──────────────────────────────────────────────────────────────

// Muss vor der statischen Auslieferung stehen: sonst wären die Segmente eines
// internen Videos über ihren Pfad frei abrufbar und die Sichtbarkeit nur eine
// Anzeige in der Oberfläche.
app.use('/uploads/hls/:videoId', (req, res, next) => {
  const video = getVideoById(req.params.videoId);
  if (video && video.visibility === 'internal' && !roleAtLeast(mediaSessionRole(req), 'editor')) {
    return res.status(403).json({ error: 'Dieses Video ist nur intern verfügbar' });
  }
  next();
});

app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res, filePath) => {
    // Segmente bekommen einen unveränderlichen Namen und ändern sich nie mehr —
    // die Playlist dagegen schon, sobald neu aufbereitet wird.
    if (filePath.endsWith('.ts')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else if (filePath.endsWith('.m3u8')) res.setHeader('Cache-Control', 'public, max-age=60');
  },
}));

const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) app.use(express.static(DIST_DIR));

// ── DB init ───────────────────────────────────────────────────────────────────
getDb(); // Initialize schema on startup

// ── Aufbereitung ──────────────────────────────────────────────────────────────

let transcodingAvailable = false;

/** Beschreibt einen Aufbereitungsauftrag für die Warteschlange. */
function buildTranscodeJob(video) {
  if (!video?.filename) return null;
  const sourcePath = path.join(VIDEOS_DIR, video.filename);
  if (!fs.existsSync(sourcePath)) return null;

  return {
    videoId: video.id,
    sourcePath,
    hlsRoot: HLS_DIR,
    thumbnailsDir: THUMBNAILS_DIR,
    publicThumbnailBase: '/uploads/thumbnails',
    // Sobald eine Fassung fertig ist, sollen offene Seiten sie sehen.
    onDone: (id, status) => publishEvent('videos', { reason: 'transcode', id, status }),
  };
}

function queueTranscode(video) {
  if (!transcodingAvailable) return;
  const job = buildTranscodeJob(video);
  if (job) enqueueTranscode(job);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registrierung.
 *
 * Vorher stand sie jedem offen — und jedes Konto durfte hochladen. Auf einem
 * erreichbaren Server hätte damit jeder Videos ins Vereinsportal stellen
 * können. Jetzt gilt: das allererste Konto legt sich selbst an und wird Admin,
 * danach vergibt die Redaktion Konten. Wer trotzdem offene Registrierung will,
 * setzt ALLOW_PUBLIC_REGISTRATION=true — neue Konten sind dann Zuschauer.
 */
function registrationMode() {
  if (countUsers() === 0) return 'bootstrap';
  if (process.env.ALLOW_PUBLIC_REGISTRATION === 'true') return 'open';
  return 'closed';
}

app.get('/api/auth/registration', (req, res) => {
  res.json({ mode: registrationMode() });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const mode = registrationMode();
    if (mode === 'closed') {
      return res.status(403).json({
        error: 'Konten werden von der Redaktion vergeben. Melde dich bei support@vfl-bochum.de.',
      });
    }

    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'Username, Email und Passwort sind erforderlich' });
    if (username.length < 3 || username.length > 24)
      return res.status(400).json({ error: 'Username muss 3-24 Zeichen lang sein' });
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return res.status(400).json({ error: 'Username darf nur Buchstaben, Zahlen und _ enthalten' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });

    if (getUserByUsername(username)) return res.status(409).json({ error: 'Username bereits vergeben' });
    if (getUserByEmail(email)) return res.status(409).json({ error: 'Email bereits registriert' });

    const passwordHash = await bcrypt.hash(password, 10);
    // Das erste Konto muss verwalten können, sonst kommt niemand mehr rein.
    const user = createUser({ username, email, passwordHash, role: mode === 'bootstrap' ? 'admin' : 'viewer' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    issueMediaSession(res, user.id, user.role);

    console.log(`[Auth] Neues Konto: ${username} (${user.role})`);
    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { login, password } = req.body; // login = username or email
    if (!login || !password) return res.status(400).json({ error: 'Login und Passwort erforderlich' });

    const user = getUserByUsername(login) || getUserByEmail(login);
    if (!user) return res.status(401).json({ error: 'Ungültige Zugangsdaten' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Ungültige Zugangsdaten' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    issueMediaSession(res, user.id, user.role || 'viewer');
    console.log(`[Auth] Login: ${user.username}`);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Login fehlgeschlagen' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  clearMediaSession(res);
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // Nach einem Neuladen liegt der Token noch im Browser, das Medien-Cookie aber
  // womöglich nicht mehr — hier wieder auffrischen.
  issueMediaSession(res, user.id, user.role || 'viewer');
  // Include stream_key for own profile
  const { password_hash, ...rest } = user;
  res.json(rest);
});

// ── Nutzerverwaltung (nur Admin) ──────────────────────────────────────────────

app.get('/api/admin/users', requireRole('admin'), (req, res) => {
  res.json(listUsers());
});

app.post('/api/admin/users', requireRole('admin'), async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'Benutzername, E-Mail und Passwort sind erforderlich' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return res.status(400).json({ error: 'Benutzername darf nur Buchstaben, Zahlen und _ enthalten' });
  if (role && !ROLES.includes(role))
    return res.status(400).json({ error: 'Unbekannte Rolle' });
  if (getUserByUsername(username)) return res.status(409).json({ error: 'Benutzername bereits vergeben' });
  if (getUserByEmail(email)) return res.status(409).json({ error: 'E-Mail bereits registriert' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = createUser({ username, email, passwordHash, role: role || 'editor' });
  console.log(`[Admin] ${req.userId} legte Konto an: ${username} (${user.role})`);
  res.status(201).json(safeUser(user));
});

app.patch('/api/admin/users/:id', requireRole('admin'), (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { role } = req.body;
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Unbekannte Rolle' });

  const target = getUserById(targetId);
  if (!target) return res.status(404).json({ error: 'Konto nicht gefunden' });

  // Sonst sperrt sich die Redaktion selbst aus.
  if (target.role === 'admin' && role !== 'admin' && countAdmins() <= 1) {
    return res.status(409).json({ error: 'Das ist das letzte Adminkonto — vorher ein weiteres anlegen.' });
  }

  setUserRole(targetId, role);
  res.json({ success: true });
});

app.delete('/api/admin/users/:id', requireRole('admin'), (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (targetId === req.userId) return res.status(409).json({ error: 'Das eigene Konto lässt sich nicht löschen' });

  const target = getUserById(targetId);
  if (!target) return res.status(404).json({ error: 'Konto nicht gefunden' });
  if (target.role === 'admin' && countAdmins() <= 1) {
    return res.status(409).json({ error: 'Das ist das letzte Adminkonto' });
  }

  deleteUser(targetId);
  res.json({ success: true });
});

app.patch('/api/auth/me', requireAuth, (req, res) => {
  const { displayName, bio, avatarUrl } = req.body;
  updateUserProfile(req.userId, { displayName, bio, avatarUrl });
  res.json({ success: true });
});

app.post('/api/auth/stream-key/regenerate', requireRole('editor'), (req, res) => {
  const newKey = regenerateStreamKey(req.userId);
  res.json({ streamKey: newKey });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CHANNEL ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/live', (req, res) => {
  const liveChannels = getAllLiveChannels();
  res.json(liveChannels);
});

app.get('/api/channels/:username', optionalAuth, (req, res) => {
  const user = getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'Kanal nicht gefunden' });

  const videos = getVideosByUser(user.id, { includeInternal: roleAtLeast(req.userRole, 'editor') });
  const { password_hash, ...publicUser } = user;
  if (user.is_live === 1) {
    publicUser.stream_key = user.stream_key;
  } else {
    delete publicUser.stream_key;
  }
  res.json({ channel: publicUser, videos });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/videos', optionalAuth, (req, res) => {
  const { search, category, season, competition, team, limit, offset } = req.query;
  const videos = getAllVideos({
    search, category, season, competition, team,
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0,
    includeInternal: roleAtLeast(req.userRole, 'editor'),
  });
  res.json(videos);
});

/** Saisons, Wettbewerbe und Mannschaften, zu denen es wirklich Videos gibt. */
app.get('/api/taxonomy', optionalAuth, (req, res) => {
  res.json(getTaxonomy({ includeInternal: roleAtLeast(req.userRole, 'editor') }));
});

app.get('/api/videos/:id', optionalAuth, (req, res) => {
  const video = getVideoById(req.params.id);
  // Interne Videos sollen sich nicht einmal durch ein 403 verraten.
  if (!video || !mayAccess(video, req)) return res.status(404).json({ error: 'Video nicht gefunden' });
  res.json(video);
});

/**
 * Aufrufe zählen.
 *
 * Vorher zählte jeder Abruf der Metadaten mit — also auch jedes Neuladen der
 * Seite, jeder geteilte Link, den jemand nur öffnet, und jeder Crawler. Gezählt
 * wird jetzt, wenn die Wiedergabe wirklich beginnt, und pro Gerät nur einmal
 * innerhalb eines Zeitfensters.
 */
const VIEW_WINDOW_MS = 1000 * 60 * 60 * 6;
const recentViews = new Map(); // "videoId|absender" → Zeitstempel

function alreadyCounted(videoId, req) {
  const sender = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unbekannt';
  const key = `${videoId}|${sender}`;
  const now = Date.now();
  const last = recentViews.get(key);

  if (last && now - last < VIEW_WINDOW_MS) return true;
  recentViews.set(key, now);

  // Aufräumen, damit die Map nicht unbegrenzt wächst.
  if (recentViews.size > 20000) {
    for (const [k, t] of recentViews) {
      if (now - t >= VIEW_WINDOW_MS) recentViews.delete(k);
    }
  }
  return false;
}

app.post('/api/videos/:id/view', (req, res) => {
  const video = getVideoById(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video nicht gefunden' });
  if (!alreadyCounted(req.params.id, req)) incrementVideoViews(req.params.id);
  res.json({ success: true });
});

app.get('/api/videos/:id/stream', optionalAuth, (req, res) => {
  const video = getVideoById(req.params.id);
  if (!video || !mayAccess(video, req)) return res.status(404).json({ error: 'Video not found' });

  const videoPath = path.join(VIDEOS_DIR, video.filename);
  if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'Video file missing' });

  res.sendFile(videoPath, { acceptRanges: true }, (err) => {
    if (err && !res.headersSent) {
      console.error('[Stream Error]', err);
      res.status(500).end();
    }
  });
});

app.post('/api/upload', requireRole('editor'), upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), (req, res) => {
  try {
    const {
      title, description, category, duration, customThumbnailData, visibility,
      team, competition, season, matchday,
    } = req.body;
    const videoFile = req.files?.['video']?.[0];
    if (!videoFile) return res.status(400).json({ error: 'Video file is required' });

    const videoId = randomUUID();
    let thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80';

    if (req.files?.['thumbnail']) {
      thumbnailUrl = `/uploads/thumbnails/${req.files['thumbnail'][0].filename}`;
    } else if (customThumbnailData?.startsWith('data:image')) {
      const base64Data = customThumbnailData.replace(/^data:image\/\w+;base64,/, '');
      const thumbFilename = `thumb-${Date.now()}.jpg`;
      fs.writeFileSync(path.join(THUMBNAILS_DIR, thumbFilename), base64Data, 'base64');
      thumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;
    }

    const video = createVideo({
      id: videoId,
      userId: req.userId,
      title: title || videoFile.originalname,
      description: description || '',
      filename: videoFile.filename,
      thumbnailUrl,
      category: category || 'General',
      duration: parseFloat(duration) || 0,
      transcodeStatus: transcodingAvailable ? 'pending' : 'skipped',
      visibility,
      team, competition, season, matchday,
    });

    const user = getUserById(req.userId);
    console.log(`[Upload] ${user?.username} uploaded: ${video.title}`);
    queueTranscode(video);
    publishEvent('videos', { reason: 'upload', id: videoId });
    res.status(201).json({ ...video, videoUrl: `/api/videos/${videoId}/stream` });
  } catch (err) {
    console.error('[Upload] Error:', err);
    res.status(500).json({ error: 'Upload fehlgeschlagen: ' + err.message });
  }
});

app.delete('/api/videos/:id', requireRole('editor'), (req, res) => {
  const video = getVideoById(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video nicht gefunden' });
  if (video.user_id !== req.userId) return res.status(403).json({ error: 'Keine Berechtigung' });

  if (video.filename) {
    const filePath = path.join(VIDEOS_DIR, video.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  // Die aufbereitete Fassung liegt in einem eigenen Ordner und muss mit weg,
  // sonst sammeln sich die Segmente auf der Platte.
  const hlsPath = path.join(HLS_DIR, req.params.id);
  if (fs.existsSync(hlsPath)) fs.rmSync(hlsPath, { recursive: true, force: true });

  deleteVideo(req.params.id, req.userId);
  publishEvent('videos', { reason: 'delete', id: req.params.id });
  res.json({ success: true });
});

app.post('/api/videos/:id/like', requireAuth, (req, res) => {
  const video = getVideoById(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video nicht gefunden' });
  getDb().prepare('UPDATE videos SET likes = likes + 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE / MEDIAMTX INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

// MediaMTX calls this to validate a stream key before accepting RTMP publish
app.post('/api/internal/stream-auth', (req, res) => {
  console.log('[StreamAuth Debug] Body:', req.body);
  console.log('[StreamAuth Debug] Query:', req.query);

  const { user, action, path: streamPath } = req.query;
  const bodyPath = req.body?.path;

  // MediaMTX v1.19+ sends JSON body with 'path' field instead of query params
  const streamKey = user || req.body?.user || streamPath?.split('/')?.pop() || bodyPath?.split('/')?.pop();

  if (!streamKey) return res.status(401).json({ error: 'No stream key provided' });

  const dbUser = getUserByStreamKey(streamKey);
  if (!dbUser) {
    console.log(`[StreamAuth] Rejected unknown stream key: ${streamKey}`);
    return res.status(401).json({ error: 'Invalid stream key' });
  }

  console.log(`[StreamAuth] Accepted stream from: ${dbUser.username}`);
  res.sendStatus(200);
});

// MediaMTX webhook: stream started (via on_publish.sh)
// The stream key is extracted from the MTX_PATH env var in on_publish.sh
app.post('/api/internal/obs-start', (req, res) => {
  console.log('[Webhook Debug] obs-start URL:', req.originalUrl);
  console.log('[Webhook Debug] obs-start Headers:', req.headers);
  console.log('[Webhook Debug] obs-start Body:', req.body);
  console.log('[Webhook Debug] obs-start Query:', req.query);

  const streamKey = req.query?.streamKey || req.body?.streamKey || req.query?.user || req.body?.user || req.query?.path?.split('/')?.pop();

  if (streamKey) {
    const user = getUserByStreamKey(streamKey);
    if (user) {
      const title = req.body?.title || `${user.display_name || user.username}'s Live Stream`;
      updateUserLiveStatus(user.id, true, title);
      startLiveSession(user.id, title);
      activeLiveStream = {
        id: `live-obs-${user.id}`,
        userId: user.id,
        username: user.username,
        stream_key: user.stream_key,
        title,
        uploader: user.display_name || user.username,
        isLive: true,
        startedAt: new Date().toISOString(),
        views: 1,
        thumbnailUrl: user.avatar_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
      };
      console.log(`[Webhook] Stream started for user: ${user.username}`);
      publishEvent('live', { active: true, username: user.username });
      return res.sendStatus(200);
    }
  }

  console.warn('[Webhook] obs-start called without valid user stream key:', { query: req.query, body: req.body });
  res.sendStatus(200);
});

app.post('/api/internal/obs-stop', (req, res) => {
  const streamKey = req.query?.streamKey || req.body?.streamKey || req.query?.user || req.body?.user || req.query?.path?.split('/')?.pop();

  if (streamKey) {
    const user = getUserByStreamKey(streamKey);
    if (user) {
      updateUserLiveStatus(user.id, false);
      endLiveSession(user.id);
      if (activeLiveStream?.userId === user.id) {
        activeLiveStream = null;
        liveViewers.clear();
      }
      console.log(`[Webhook] Stream ended for user: ${user.username}`);
      publishEvent('live', { active: false, username: user.username });
      return res.sendStatus(200);
    }
  }

  if (activeLiveStream) {
    activeLiveStream = null;
    liveViewers.clear();
  }
  publishEvent('live', { active: false });
  res.sendStatus(200);
});

// Legacy status endpoint
app.get('/api/live/status', (req, res) => {
  res.json({
    active: !!activeLiveStream,
    stream: activeLiveStream,
    viewers: liveViewers.size + 1
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT-STROM (Server-Sent Events)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vorher fragte jeder offene Tab alle fünf Sekunden drei Endpunkte ab — bei
 * 500 Zuschauern rund 300 Anfragen pro Sekunde für Daten, die sich fast nie
 * ändern. Jetzt hält der Client eine Verbindung offen und der Server meldet
 * sich, wenn tatsächlich etwas passiert.
 */
const eventClients = new Set();

function publishEvent(type, data = {}) {
  if (eventClients.size === 0) return;
  const frame = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  eventClients.forEach(client => {
    try { client.write(frame); } catch { eventClients.delete(client); }
  });
}

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Verhindert, dass ein vorgelagerter nginx den Strom puffert.
    'X-Accel-Buffering': 'no',
  });
  res.write(': verbunden\n\n');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  eventClients.add(res);

  // Hält Proxys davon ab, die scheinbar untätige Verbindung zu kappen.
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* wird beim close aufgeräumt */ }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    eventClients.delete(res);
  });
});

app.get('/api/system/info', (req, res) => {
  const ip = getLocalIp();
  res.json({
    localIp: ip,
    port: PORT,
    httpsPort: HTTPS_PORT,
    networkUrl: `http://${ip}:${PORT}`,
    httpsUrl: `https://${ip}:${HTTPS_PORT}`,
    hostname: os.hostname(),
    uptime: process.uptime(),
    platform: os.platform(),
    arch: os.arch(),
    totalMem: Math.round(os.totalmem() / (1024 ** 3)) + ' GB',
    freeMem: Math.round(os.freemem() / (1024 ** 3)) + ' GB',
    transcoding: { available: transcodingAvailable, ...queueState() },
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WEBSOCKET – PHONE CAMERA LIVE + CHAT
// ═══════════════════════════════════════════════════════════════════════════════

const wssHttp = new WebSocketServer({ server: httpServer });
let activeLiveStream = null;
let publisherSocket = null;
let liveViewers = new Set();

/**
 * Puffer für den Handy-Stream.
 *
 * Der erste Chunk trägt den WebM-Header — ohne ihn kann ein später
 * dazugekommener Zuschauer den Stream nicht dekodieren, deshalb liegt er
 * separat und bleibt erhalten. Alles Weitere ist nur Anlauf und rollt durch:
 * vorher wuchs das Array unbegrenzt weiter, was bei einem 90-Minuten-Stream
 * mit 3 Mbit/s auf rund 2 GB im Arbeitsspeicher hinauslief.
 */
const LIVE_CHUNK_BUFFER = 10;
let liveInitChunk = null;
let liveChunks = [];

function resetLiveBuffer() {
  liveInitChunk = null;
  liveChunks = [];
}

function broadcastToAll(message) {
  const jsonStr = typeof message === 'string' ? message : JSON.stringify(message);
  if (publisherSocket?.readyState === 1) publisherSocket.send(jsonStr);
  liveViewers.forEach(v => { if (v.readyState === 1) v.send(jsonStr); });
}

function broadcastViewerCount() {
  broadcastToAll({ type: 'viewers', count: liveViewers.size + 1 });
}

function finishLiveStream(fileWriteStream, filename) {
  if (fileWriteStream) {
    try { fileWriteStream.end(); } catch {}
  }
  if (activeLiveStream && activeLiveStream.id === 'live-now') {
    const title = activeLiveStream.title;
    const userId = activeLiveStream.userId;
    activeLiveStream = null;
    liveViewers.clear();
    resetLiveBuffer();

    // Save as VOD in SQLite if we have a user
    if (userId) {
      const vodId = randomUUID();
      const recording = createVideo({
        id: vodId,
        userId,
        title: `Aufzeichnung: ${title}`,
        description: 'Automatische Handy-Stream Aufzeichnung.',
        filename,
        thumbnailUrl: '',
        category: 'General',
        duration: 0,
        transcodeStatus: transcodingAvailable ? 'pending' : 'skipped',
      });
      console.log(`[VOD] Saved phone stream recording: ${title}`);
      // Die Aufzeichnung ist rohes WebM ohne bekannte Länge — die Aufbereitung
      // liefert beides nach: Dauer und ein Standbild.
      queueTranscode(recording);
      publishEvent('videos', { reason: 'recording', id: vodId });
    }
    publishEvent('live', { active: false });
  }
}

function setupWebSocket(wssInstance) {
  wssInstance.on('connection', (ws, req) => {
    const url = req.url || '';

    if (url.includes('/live/publish')) {
      console.log('📱 Phone stream publisher connected');
      publisherSocket = ws;
      const streamFilename = `live-rec-${Date.now()}.webm`;
      const fileWriteStream = fs.createWriteStream(path.join(VIDEOS_DIR, streamFilename));
      let streamUserId = null;

      ws.on('message', (message, isBinary) => {
        if (isBinary) {
          try { fileWriteStream.write(message); } catch {}
          if (!liveInitChunk) {
            liveInitChunk = message;
          } else {
            liveChunks.push(message);
            if (liveChunks.length > LIVE_CHUNK_BUFFER) liveChunks.shift();
          }
          liveViewers.forEach(viewer => { if (viewer.readyState === 1) viewer.send(message); });
        } else {
          try {
            const data = JSON.parse(message.toString());
            if (data.type === 'start') {
              // Optionally associate with logged-in user via token
              if (data.token) {
                try {
                  const payload = jwt.verify(data.token, JWT_SECRET);
                  streamUserId = payload.userId;
                } catch {}
              }
              activeLiveStream = {
                id: 'live-now',
                userId: streamUserId,
                title: data.title || 'Handy Live Stream',
                uploader: data.uploader || 'Handy Live Cam',
                isLive: true,
                startedAt: new Date().toISOString(),
                views: 1,
                thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
              };
              resetLiveBuffer();
              if (streamUserId) {
                updateUserLiveStatus(streamUserId, true, activeLiveStream.title);
                startLiveSession(streamUserId, activeLiveStream.title);
              }
              console.log(`[WS] Phone stream started: ${activeLiveStream.title}`);
              publishEvent('live', { active: true });
            } else if (data.type === 'stop') {
              if (streamUserId) {
                updateUserLiveStatus(streamUserId, false);
                endLiveSession(streamUserId);
              }
              finishLiveStream(fileWriteStream, streamFilename);
            } else if (data.type === 'chat') {
              broadcastToAll(data);
            }
          } catch {}
        }
      });

      ws.on('close', () => {
        publisherSocket = null;
        if (streamUserId) {
          updateUserLiveStatus(streamUserId, false);
          endLiveSession(streamUserId);
        }
        finishLiveStream(fileWriteStream, streamFilename);
      });

    } else if (url.includes('/live/watch')) {
      liveViewers.add(ws);
      // Header zuerst, dann der gepufferte Anlauf — sonst startet der Decoder nicht.
      if (activeLiveStream && liveInitChunk && ws.readyState === 1) {
        ws.send(liveInitChunk);
        liveChunks.forEach(chunk => { if (ws.readyState === 1) ws.send(chunk); });
      }
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'chat') broadcastToAll(data);
        } catch {}
      });
      broadcastViewerCount();
      ws.on('close', () => { liveViewers.delete(ws); broadcastViewerCount(); });
    }
  });
}

setupWebSocket(wssHttp);
if (httpsServer) setupWebSocket(new WebSocketServer({ server: httpsServer }));

// ── Catch-all for SPA ─────────────────────────────────────────────────────────

// Unbekannte API-Pfade sollen als Fehler ankommen, nicht als HTML-Seite —
// sonst versucht der Client, eine Startseite als JSON zu lesen.
app.use('/api', (req, res) => res.status(404).json({ error: 'Unbekannter Endpunkt' }));

// Alles andere übernimmt der Router im Browser, damit auch ein direkt
// aufgerufener Link wie /video/<id> die Anwendung lädt.
if (fs.existsSync(DIST_DIR)) {
  app.get('*', (req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

// ── Start Servers ─────────────────────────────────────────────────────────────
// Erst prüfen, ob ffmpeg überhaupt da ist. Fehlt es, läuft alles weiter wie
// bisher — die Originaldatei wird dann direkt ausgeliefert.
isFfmpegAvailable().then(available => {
  transcodingAvailable = available;
  if (!available) {
    console.warn('[Transcode] ffmpeg nicht gefunden — Videos werden unverändert ausgeliefert.');
    return;
  }
  console.log(`[Transcode] bereit${process.env.TRANSCODE_HWACCEL ? ` (${process.env.TRANSCODE_HWACCEL})` : ''}`);
  resumePending(buildTranscodeJob);
});

httpServer.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`
  ======================================================
  🎬 StreamHub Platform Server Running
  ======================================================
  HTTP  URL:   http://${localIp}:${PORT}
  HTTPS URL:   https://${localIp}:${HTTPS_PORT}
  ======================================================
  `);
});

if (httpsServer) {
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🔒 HTTPS Server running on https://0.0.0.0:${HTTPS_PORT}`);
  });
}
