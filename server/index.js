import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

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
  limits: { fileSize: 10 * 1024 * 1024 * 1024 } // 10 GB max upload
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

// Seed Demo VODs with LOCAL mp4 files
function seedSampleVideos() {
  const db = readDB();
  // Always verify seed sample files exist on disk
  const sample1Exists = fs.existsSync(path.join(VIDEOS_DIR, 'sample-demo.mp4'));
  const sample2Exists = fs.existsSync(path.join(VIDEOS_DIR, 'sample-demo2.mp4'));

  // Update or reset sample VODs if external or broken
  const updatedVideos = (db.videos || []).filter(v => !v.isExternal);

  if (updatedVideos.length === 0) {
    const sampleVideos = [];

    if (sample1Exists) {
      sampleVideos.push({
        id: 'demo-local-1',
        title: 'FiveM Ultra HD Stream Showcase - Local 4K VOD',
        description: 'Echter lokaler Stream-Test von der Proxmox Intel NUC SSD. Ultra-Low-Latency Seek und 100% offline verfügbar.',
        category: 'Gaming',
        duration: 18,
        views: 2450,
        likes: 340,
        dislikes: 2,
        uploader: 'FiveM Core Node',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        filename: 'sample-demo.mp4',
        videoUrl: '/api/videos/demo-local-1/stream',
        thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
        isExternal: false,
        tags: ['FiveM', '4K', 'Proxmox', 'Local VOD'],
        comments: [
          { id: 'c1', user: 'FiveM Admin', text: 'Läuft mit <10ms Latenz perfekt im NUC-Netzwerk!', date: new Date().toISOString() }
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

// API Routes

// System info endpoint
app.get('/api/system/info', (req, res) => {
  const ip = getLocalIp();
  res.json({
    localIp: ip,
    port: PORT,
    networkUrl: `http://${ip}:${PORT}`,
    hostname: os.hostname(),
    uptime: process.uptime(),
    platform: os.platform(),
    arch: os.arch(),
    totalMem: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
    freeMem: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB'
  });
});

// GET /api/videos
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

// GET /api/videos/:id
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

// LOW LATENCY STREAMING ENDPOINT WITH HTTP 206 RANGE STREAMING
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
  if (ext === '.mov') mimeType = 'video/quicktime';

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

// POST /api/upload
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
        uploader: 'FiveM Streamer',
        createdAt: new Date().toISOString(),
        filename: videoFile.filename,
        videoUrl: `/api/videos/${videoId}/stream`,
        thumbnailUrl,
        mimeType: videoFile.mimetype,
        sizeBytes: videoFile.size,
        isExternal: false,
        tags: tags ? tags.split(',').map((t) => t.trim()) : ['FiveM VOD'],
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

// POST /api/videos/:id/like
app.post('/api/videos/:id/like', (req, res) => {
  const db = readDB();
  const video = db.videos.find((v) => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });

  video.likes = (video.likes || 0) + 1;
  writeDB(db);
  res.json({ likes: video.likes });
});

// POST /api/videos/:id/comment
app.post('/api/videos/:id/comment', (req, res) => {
  const { user, text } = req.body;
  if (!text) return res.status(400).json({ error: 'Comment text required' });

  const db = readDB();
  const video = db.videos.find((v) => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });

  const comment = {
    id: 'c-' + Date.now(),
    user: user || 'FiveM User',
    text,
    date: new Date().toISOString(),
  };

  video.comments = video.comments || [];
  video.comments.unshift(comment);
  writeDB(db);

  res.status(201).json(comment);
});

// DELETE /api/videos/:id
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

// Fallback to SPA index.html
if (fs.existsSync(DIST_DIR)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`
  ======================================================
  🎬 FiveM StreamHub Low-Latency Local VOD Server
  ======================================================
  Local Machine:   http://localhost:${PORT}
  Local Network:   http://${localIp}:${PORT}
  ======================================================
  `);
});
