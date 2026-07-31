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
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ensureCertsExist } from './generate-cert.js';
import {
  getDb, createUser, getUserById, getUserByUsername, getUserByEmail,
  getUserByStreamKey, updateUserLiveStatus, updateUserProfile,
  regenerateStreamKey, getAllLiveChannels, safeUser,
  createVideo, getVideoById, getVideosByUser, getAllVideos,
  incrementVideoViews, deleteVideo, startLiveSession, endLiveSession
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'streamhub_jwt_secret_change_in_prod_2024';

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

[DATA_DIR, UPLOADS_DIR, VIDEOS_DIR, THUMBNAILS_DIR].forEach(dir => {
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
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET);
      req.userId = payload.userId;
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
app.use('/uploads', express.static(UPLOADS_DIR));

const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) app.use(express.static(DIST_DIR));

// ── DB init ───────────────────────────────────────────────────────────────────
getDb(); // Initialize schema on startup

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  try {
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
    const user = createUser({ username, email, passwordHash });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`[Auth] New user registered: ${username}`);
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
    console.log(`[Auth] Login: ${user.username}`);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Login fehlgeschlagen' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // Include stream_key for own profile
  const { password_hash, ...rest } = user;
  res.json(rest);
});

app.patch('/api/auth/me', requireAuth, (req, res) => {
  const { displayName, bio, avatarUrl } = req.body;
  updateUserProfile(req.userId, { displayName, bio, avatarUrl });
  res.json({ success: true });
});

app.post('/api/auth/stream-key/regenerate', requireAuth, (req, res) => {
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

app.get('/api/channels/:username', (req, res) => {
  const user = getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'Kanal nicht gefunden' });

  const videos = getVideosByUser(user.id);
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

app.get('/api/videos', (req, res) => {
  const { search, category, limit, offset } = req.query;
  const videos = getAllVideos({ search, category, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 });
  res.json(videos);
});

app.get('/api/videos/:id', optionalAuth, (req, res) => {
  const video = getVideoById(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video nicht gefunden' });
  incrementVideoViews(req.params.id);
  res.json(video);
});

app.get('/api/videos/:id/stream', (req, res) => {
  const video = getVideoById(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });

  const videoPath = path.join(VIDEOS_DIR, video.filename);
  if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'Video file missing' });

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const ext = path.extname(videoPath).toLowerCase();
  let mimeType = 'video/mp4';
  if (ext === '.webm') mimeType = 'video/webm';
  if (ext === '.mkv') mimeType = 'video/x-matroska';

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10) || 0;
    let end = endStr?.trim() ? parseInt(endStr, 10) : fileSize - 1;
    if (isNaN(end) || end >= fileSize) end = fileSize - 1;
    if (start >= fileSize) return res.status(416).send('Range Not Satisfiable');

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(videoPath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': mimeType, 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(videoPath).pipe(res);
  }
});

app.post('/api/upload', requireAuth, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), (req, res) => {
  try {
    const { title, description, category, duration, customThumbnailData } = req.body;
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
    });

    const user = getUserById(req.userId);
    console.log(`[Upload] ${user?.username} uploaded: ${video.title}`);
    res.status(201).json({ ...video, videoUrl: `/api/videos/${videoId}/stream` });
  } catch (err) {
    console.error('[Upload] Error:', err);
    res.status(500).json({ error: 'Upload fehlgeschlagen: ' + err.message });
  }
});

app.delete('/api/videos/:id', requireAuth, (req, res) => {
  const video = getVideoById(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video nicht gefunden' });
  if (video.user_id !== req.userId) return res.status(403).json({ error: 'Keine Berechtigung' });

  if (video.filename) {
    const filePath = path.join(VIDEOS_DIR, video.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  deleteVideo(req.params.id, req.userId);
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
      return res.sendStatus(200);
    }
  }

  if (activeLiveStream) {
    activeLiveStream = null;
    liveViewers.clear();
  }
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
    freeMem: Math.round(os.freemem() / (1024 ** 3)) + ' GB'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WEBSOCKET – PHONE CAMERA LIVE + CHAT
// ═══════════════════════════════════════════════════════════════════════════════

const wssHttp = new WebSocketServer({ server: httpServer });
let activeLiveStream = null;
let publisherSocket = null;
let liveViewers = new Set();
let liveChunks = [];

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

    // Save as VOD in SQLite if we have a user
    if (userId) {
      const vodId = randomUUID();
      createVideo({
        id: vodId,
        userId,
        title: `📱 Aufzeichnung: ${title}`,
        description: 'Automatische Handy-Stream Aufzeichnung.',
        filename,
        thumbnailUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
        category: 'General',
        duration: 0,
      });
      console.log(`[VOD] Saved phone stream recording: ${title}`);
    }
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
          liveChunks.push(message);
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
                title: data.title || '🔴 Handy Live Stream',
                uploader: data.uploader || 'Handy Live Cam',
                isLive: true,
                startedAt: new Date().toISOString(),
                views: 1,
                thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
              };
              liveChunks = [];
              if (streamUserId) {
                updateUserLiveStatus(streamUserId, true, activeLiveStream.title);
                startLiveSession(streamUserId, activeLiveStream.title);
              }
              console.log(`[WS] Phone stream started: ${activeLiveStream.title}`);
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
      if (activeLiveStream && liveChunks.length > 0 && ws.readyState === 1) {
        ws.send(liveChunks[0]);
        liveChunks.slice(-10).forEach((chunk, i) => {
          if (i > 0 && ws.readyState === 1) ws.send(chunk);
        });
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
if (fs.existsSync(DIST_DIR)) {
  app.get('*', (req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

// ── Start Servers ─────────────────────────────────────────────────────────────
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
