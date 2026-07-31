import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'streamhub.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT  NOT NULL,
      stream_key  TEXT    NOT NULL UNIQUE,
      display_name TEXT,
      bio         TEXT    DEFAULT '',
      avatar_url  TEXT    DEFAULT '',
      is_live     INTEGER DEFAULT 0,
      live_title  TEXT    DEFAULT '',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS videos (
      id           TEXT    PRIMARY KEY,
      user_id      INTEGER NOT NULL,
      title        TEXT    NOT NULL,
      description  TEXT    DEFAULT '',
      filename     TEXT,
      thumbnail_url TEXT   DEFAULT '',
      category     TEXT    DEFAULT 'General',
      duration     INTEGER DEFAULT 0,
      views        INTEGER DEFAULT 0,
      likes        INTEGER DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS live_sessions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL,
      title        TEXT    DEFAULT 'Live Stream',
      started_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      ended_at     TEXT,
      peak_viewers INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS video_comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id   TEXT    NOT NULL,
      user_id    INTEGER NOT NULL,
      text       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS live_chat (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      user_id    INTEGER NOT NULL,
      text       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(session_id) REFERENCES live_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_videos_user ON videos(user_id);
    CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_users_stream_key ON users(stream_key);
    CREATE INDEX IF NOT EXISTS idx_users_is_live ON users(is_live);
  `);

  console.log('[DB] SQLite schema initialized');
}

// ── User helpers ──────────────────────────────────────────────────────────────

export function createUser({ username, email, passwordHash }) {
  const db = getDb();
  const streamKey = randomUUID().replace(/-/g, '');
  const stmt = db.prepare(`
    INSERT INTO users (username, email, password_hash, stream_key, display_name)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(username, email, passwordHash, streamKey, username);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
}

export function getUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function getUserByUsername(username) {
  return getDb().prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
}

export function getUserByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email);
}

export function getUserByStreamKey(streamKey) {
  return getDb().prepare('SELECT * FROM users WHERE stream_key = ?').get(streamKey);
}

export function updateUserLiveStatus(userId, isLive, title = '') {
  getDb().prepare('UPDATE users SET is_live = ?, live_title = ? WHERE id = ?').run(isLive ? 1 : 0, title, userId);
}

export function updateUserProfile(userId, { displayName, bio, avatarUrl }) {
  getDb().prepare(`
    UPDATE users SET
      display_name = COALESCE(?, display_name),
      bio = COALESCE(?, bio),
      avatar_url = COALESCE(?, avatar_url)
    WHERE id = ?
  `).run(displayName, bio, avatarUrl, userId);
}

export function regenerateStreamKey(userId) {
  const newKey = randomUUID().replace(/-/g, '');
  getDb().prepare('UPDATE users SET stream_key = ? WHERE id = ?').run(newKey, userId);
  return newKey;
}

export function getAllLiveChannels() {
  return getDb().prepare(`
    SELECT id, username, display_name, avatar_url, live_title, is_live, stream_key
    FROM users WHERE is_live = 1
  `).all();
}

export function safeUser(user) {
  if (!user) return null;
  const { password_hash, stream_key, ...rest } = user;
  return rest;
}

// ── Video helpers ─────────────────────────────────────────────────────────────

export function createVideo({ id, userId, title, description, filename, thumbnailUrl, category, duration }) {
  getDb().prepare(`
    INSERT INTO videos (id, user_id, title, description, filename, thumbnail_url, category, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, title, description, filename, thumbnailUrl || '', category || 'General', duration || 0);
  return getDb().prepare('SELECT * FROM videos WHERE id = ?').get(id);
}

export function getVideoById(id) {
  return getDb().prepare(`
    SELECT v.*, u.username, u.display_name, u.avatar_url,
           COALESCE(u.display_name, u.username, 'VfL Redaktion') AS uploader
    FROM videos v LEFT JOIN users u ON v.user_id = u.id
    WHERE v.id = ?
  `).get(id);
}

export function getVideosByUser(userId) {
  return getDb().prepare(`
    SELECT v.*, u.username, u.display_name, u.avatar_url,
           COALESCE(u.display_name, u.username, 'VfL Redaktion') AS uploader
    FROM videos v LEFT JOIN users u ON v.user_id = u.id
    WHERE v.user_id = ? ORDER BY v.created_at DESC
  `).all(userId);
}

export function getAllVideos({ category, search, limit = 50, offset = 0 } = {}) {
  let sql = `
    SELECT v.*, u.username, u.display_name, u.avatar_url,
           COALESCE(u.display_name, u.username, 'VfL Redaktion') AS uploader
    FROM videos v LEFT JOIN users u ON v.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (category && category !== 'All') { sql += ' AND v.category = ?'; params.push(category); }
  if (search) { sql += ' AND (v.title LIKE ? OR v.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY v.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return getDb().prepare(sql).all(...params);
}

export function incrementVideoViews(id) {
  getDb().prepare('UPDATE videos SET views = views + 1 WHERE id = ?').run(id);
}

export function deleteVideo(id, userId) {
  const result = getDb().prepare('DELETE FROM videos WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}

// ── Live Session helpers ──────────────────────────────────────────────────────

export function startLiveSession(userId, title) {
  const result = getDb().prepare(`
    INSERT INTO live_sessions (user_id, title) VALUES (?, ?)
  `).run(userId, title || 'Live Stream');
  return result.lastInsertRowid;
}

export function endLiveSession(userId) {
  getDb().prepare(`
    UPDATE live_sessions SET ended_at = datetime('now')
    WHERE user_id = ? AND ended_at IS NULL
  `).run(userId);
}
