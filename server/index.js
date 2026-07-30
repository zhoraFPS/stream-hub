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
import { ensureCertsExist } from './generate-cert.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 5443;

// Create HTTP Server
const httpServer = http.createServer(app);

// Create HTTPS Server if SSL certs available
let httpsServer = null;
const sslCerts = ensureCertsExist();
if (sslCerts && sslCerts.key && sslCerts.cert) {
  try {
    httpsServer = https.createServer({ key: sslCerts.key, cert: sslCerts.cert }, app);
  } catch (e) {
    console.log('HTTPS init warning:', e.message);
  }
}

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Global CORS headers for media streaming
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// File paths setup
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure directories exist
[DATA_DIR, UPLOADS_DIR, VIDEOS_DIR, THUMBNAILS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, VIDEOS_DIR);
    } else if (file.fieldname === 'thumbnail') {
      cb(null, THUMBNAILS_DIR);
    } else {
      cb(new Error('Invalid field name'), null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }
});

// JSON DB Helpers
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = { videos: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB, resetting:', err);
    return { videos: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Helper to get local network IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

// Seed Demo VODs
function seedSampleVideos() {
  const db = readDB();
  const sample1Exists = fs.existsSync(path.join(VIDEOS_DIR, 'sample-demo.mp4'));
  const sample2Exists = fs.existsSync(path.join(VIDEOS_DIR, 'sample-demo2.mp4'));

  const updatedVideos = (db.videos || []).filter(v => !v.isExternal);

  if (updatedVideos.length === 0) {
    const sampleVideos = [];

    if (sample1Exists) {
      sampleVideos.push({
        id: 'demo-local-1',
        title: 'StreamHub Ultra HD Showcase - Local 4K VOD',
        description: 'Echter lokaler Stream-Test von der Proxmox Intel NUC SSD. Ultra-Low-Latency Seek und 100% offline verfügbar.',
        category: 'Gaming',
        duration: 18,
        views: 2450,
        likes: 340,
        dislikes: 2,
        uploader: 'Core Node',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        filename: 'sample-demo.mp4',
        videoUrl: '/api/videos/demo-local-1/stream',
        thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
        isExternal: false,
        tags: ['4K', 'Proxmox', 'Local VOD'],
        comments: [
          { id: 'c1', user: 'Admin', text: 'Läuft mit <10ms Latenz perfekt im NUC-Netzwerk!', date: new Date().toISOString() }
        ]
      });
    }

    if (sample2Exists) {
      sampleVideos.push({
        id: 'demo-local-2',
        title: 'Intel QuickSync Hardware Transcode Benchmark',
        description: 'VOD Performance Test für Proxmox VE Hardware-Beschleunigung mit der Intel iGPU.',
        category: 'Tutorials',
        duration: 11,
        views: 1280,
        likes: 195,
        dislikes: 0,
        uploader: 'Proxmox NUC',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        filename: 'sample-demo2.mp4',
        videoUrl: '/api/videos/demo-local-2/stream',
        thumbnailUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
        isExternal: false,
        tags: ['Intel NUC', 'QSV', 'Low Latency'],
        comments: []
      });
    }

    db.videos = sampleVideos;
    writeDB(db);
    console.log('Seeded local sample VODs.');
  }
}

seedSampleVideos();

// Static routes for uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// Static files in production
const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
}

// REAL-TIME WEBSOCKET LIVE STREAMING ENGINE & CHAT BROADCASTER
const wssHttp = new WebSocketServer({ server: httpServer });
let activeLiveStream = null;
let publisherSocket = null;
let liveViewers = new Set();
let liveChunks = [];

function broadcastToAll(message) {
  const jsonStr = typeof message === 'string' ? message : JSON.stringify(message);
  if (publisherSocket && publisherSocket.readyState === 1) {
    publisherSocket.send(jsonStr);
  }
  liveViewers.forEach((v) => {
    if (v.readyState === 1) v.send(jsonStr);
  });
}

function setupWebSocket(wssInstance) {
  wssInstance.on('connection', (ws, req) => {
    const url = req.url || '';

    if (url.includes('/live/publish')) {
      console.log('📱 Live Stream Publisher Connected');
      publisherSocket = ws;
      let streamFilename = `live-rec-${Date.now()}.webm`;
      let streamFilePath = path.join(VIDEOS_DIR, streamFilename);
      let fileWriteStream = fs.createWriteStream(streamFilePath);

      ws.on('message', (message, isBinary) => {
        if (isBinary) {
          fileWriteStream.write(message);
          liveChunks.push(message);

          liveViewers.forEach((viewer) => {
            if (viewer.readyState === 1) {
              viewer.send(message);
            }
          });
        } else {
          try {
            const data = JSON.parse(message.toString());
            if (data.type === 'start') {
              activeLiveStream = {
                id: 'live-now',
                title: data.title || '🔴 Live-Stream',
                uploader: data.uploader || 'Handy Live Cam',
                isLive: true,
                startedAt: new Date().toISOString(),
                views: 1,
                thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
              };
              liveChunks = [];
              console.log(`Live Stream Started: ${activeLiveStream.title}`);
            } else if (data.type === 'stop') {
              finishLiveStream(fileWriteStream, streamFilename);
            } else if (data.type === 'chat') {
              broadcastToAll(data);
            }
          } catch (e) {}
        }
      });

      ws.on('close', () => {
        publisherSocket = null;
        finishLiveStream(fileWriteStream, streamFilename);
      });

    } else if (url.includes('/live/watch')) {
      liveViewers.add(ws);
      
      // Send header chunk + last 10 chunks for fast startup
      if (activeLiveStream && liveChunks.length > 0) {
        if (ws.readyState === 1) {
          ws.send(liveChunks[0]);
          const recentChunks = liveChunks.slice(-10);
          recentChunks.forEach((chunk, i) => {
            if (i > 0 && ws.readyState === 1) {
              ws.send(chunk);
            }
          });
        }
      }

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'chat') {
            broadcastToAll(data);
          }
        } catch (e) {}
      });
      
      broadcastViewerCount();
      ws.on('close', () => {
        liveViewers.delete(ws);
        broadcastViewerCount();
      });
    }
  });
}

setupWebSocket(wssHttp);

if (httpsServer) {
  const wssHttps = new WebSocketServer({ server: httpsServer });
  setupWebSocket(wssHttps);
}

function broadcastViewerCount() {
  const count = liveViewers.size + 1;
  broadcastToAll({ type: 'viewers', count });
}

function finishLiveStream(fileWriteStream, filename) {
  if (!activeLiveStream) return;
  
  fileWriteStream.end();
  const liveTitle = activeLiveStream.title;
  activeLiveStream = null;
  liveViewers.clear();

  const db = readDB();
  const vodId = 'vod-' + Date.now();
  const newVod = {
    id: vodId,
    title: `🔴 Aufzeichnung: ${liveTitle}`,
    description: 'Automatische Live-Stream Aufzeichnung.',
    category: 'Gaming',
    duration: 30,
    views: 1,
    likes: 10,
    dislikes: 0,
    uploader: 'Handy Live Stream',
    createdAt: new Date().toISOString(),
    filename,
    videoUrl: `/api/videos/${vodId}/stream`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
    isExternal: false,
    tags: ['Handy Stream', 'Live Aufzeichnung', 'Proxmox'],
    comments: []
  };

  db.videos.unshift(newVod);
  writeDB(db);
  console.log(`Live Stream saved to VOD library: ${newVod.title}`);
}

// API Routes

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
    totalMem: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
    freeMem: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB'
  });
});

app.get('/api/videos', (req, res) => {
  const { search, category } = req.query;
  const db = readDB();
  let videos = db.videos;

  if (category && category !== 'All') {
    videos = videos.filter((v) => v.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    videos = videos.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        (v.tags && v.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  videos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(videos);
});

app.get('/api/videos/:id', (req, res) => {
  const db = readDB();
  const video = db.videos.find((v) => v.id === req.params.id);

  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  video.views = (video.views || 0) + 1;
  writeDB(db);

  res.json(video);
});

app.get('/api/videos/:id/stream', (req, res) => {
  const db = readDB();
  const video = db.videos.find((v) => v.id === req.params.id);

  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  if (video.isExternal && video.videoUrl) {
    return res.redirect(video.videoUrl);
  }

  const videoPath = path.join(VIDEOS_DIR, video.filename);

  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Video file missing on server disk' });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const ext = path.extname(videoPath).toLowerCase();
  let mimeType = 'video/mp4';
  if (ext === '.webm') mimeType = 'video/webm';
  if (ext === '.mkv') mimeType = 'video/x-matroska';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10) || 0;
    let end = parts[1] && parts[1].trim() !== '' ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(end) || end >= fileSize) {
      end = fileSize - 1;
    }

    if (start >= fileSize) {
      res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
      return;
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    };

    res.writeHead(206, head);
    file.pipe(res);

    file.on('error', (err) => {
      console.error('Stream error:', err);
    });
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

app.post(
  '/api/upload',
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const { title, description, category, tags, duration, customThumbnailData } = req.body;
      const videoFile = req.files && req.files['video'] ? req.files['video'][0] : null;

      if (!videoFile) {
        return res.status(400).json({ error: 'Video file is required' });
      }

      const videoId = 'vod-' + Date.now();
      let thumbnailUrl = '';

      if (req.files && req.files['thumbnail']) {
        thumbnailUrl = `/uploads/thumbnails/${req.files['thumbnail'][0].filename}`;
      } else if (customThumbnailData && customThumbnailData.startsWith('data:image')) {
        const base64Data = customThumbnailData.replace(/^data:image\/\w+;base64,/, '');
        const thumbFilename = `thumb-${Date.now()}.jpg`;
        const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);
        fs.writeFileSync(thumbPath, base64Data, 'base64');
        thumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;
      } else {
        thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80';
      }

      const db = readDB();
      const newVideo = {
        id: videoId,
        title: title || videoFile.originalname,
        description: description || '',
        category: category || 'General',
        duration: duration ? parseFloat(duration) : 0,
        views: 0,
        likes: 0,
        dislikes: 0,
        uploader: 'Streamer',
        createdAt: new Date().toISOString(),
        filename: videoFile.filename,
        videoUrl: `/api/videos/${videoId}/stream`,
        thumbnailUrl,
        mimeType: videoFile.mimetype,
        sizeBytes: videoFile.size,
        isExternal: false,
        tags: tags ? tags.split(',').map((t) => t.trim()) : ['VOD'],
        comments: [],
      };

      db.videos.unshift(newVideo);
      writeDB(db);

      console.log(`Uploaded new VOD: ${newVideo.title}`);
      res.status(201).json(newVideo);
    } catch (err) {
      console.error('Upload failed:', err);
      res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
  }
);

app.post('/api/videos/:id/like', (req, res) => {
  const db = readDB();
  const video = db.videos.find((v) => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });

  video.likes = (video.likes || 0) + 1;
  writeDB(db);
  res.json({ likes: video.likes });
});

app.post('/api/videos/:id/comment', (req, res) => {
  const { user, text } = req.body;
  if (!text) return res.status(400).json({ error: 'Comment text required' });

  const db = readDB();
  const video = db.videos.find((v) => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });

  const comment = {
    id: 'c-' + Date.now(),
    user: user || 'User',
    text,
    date: new Date().toISOString(),
  };

  video.comments = video.comments || [];
  video.comments.unshift(comment);
  writeDB(db);

  res.status(201).json(comment);
});

app.delete('/api/videos/:id', (req, res) => {
  const db = readDB();
  const index = db.videos.findIndex((v) => v.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Video not found' });

  const [deletedVideo] = db.videos.splice(index, 1);

  if (!deletedVideo.isExternal && deletedVideo.filename) {
    const videoPath = path.join(VIDEOS_DIR, deletedVideo.filename);
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
  }

  writeDB(db);
  res.json({ message: 'Video deleted successfully', id: req.params.id });
});

if (fs.existsSync(DIST_DIR)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Listen HTTP
httpServer.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`
  ======================================================
  🎬 StreamHub Local Server Running
  ======================================================
  HTTP  URL:   http://${localIp}:${PORT}
  HTTPS URL:   https://${localIp}:${HTTPS_PORT}
  ======================================================
  `);
});

// Listen HTTPS
if (httpsServer) {
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🔒 HTTPS Server running on https://0.0.0.0:${HTTPS_PORT}`);
  });
}
