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

  migrate();
  console.log('[DB] SQLite schema initialized');
}

/**
 * Nachträgliche Spalten. SQLite kann kein "ADD COLUMN IF NOT EXISTS",
 * deshalb wird erst gefragt, was schon da ist. Bestandsdatenbanken laufen
 * dadurch ohne Handgriff weiter.
 */
function migrate() {
  const columns = new Set(db.prepare('PRAGMA table_info(videos)').all().map(c => c.name));
  const add = (name, definition) => {
    if (columns.has(name)) return;
    db.exec(`ALTER TABLE videos ADD COLUMN ${name} ${definition}`);
    console.log(`[DB] Spalte videos.${name} ergänzt`);
  };

  // Pfad zur master.m3u8 relativ zu /uploads, leer solange nur das Original da ist
  add('hls_path', "TEXT DEFAULT ''");
  // pending | processing | ready | failed | skipped
  add('transcode_status', "TEXT DEFAULT 'skipped'");
  add('transcode_error', "TEXT DEFAULT ''");
  add('height', 'INTEGER DEFAULT 0');
  // public = für alle sichtbar, internal = nur für angemeldete Redaktion
  add('visibility', "TEXT DEFAULT 'public'");

  // Einordnung ins Archiv. Alle optional — ein Interview gehört zu keinem
  // Spieltag, ein Trainingslager-Vlog zu keinem Wettbewerb.
  add('team', "TEXT DEFAULT ''");         // Profis, Frauen, U19, …
  add('competition', "TEXT DEFAULT ''");  // 2. Bundesliga, DFB-Pokal, Testspiel
  add('season', "TEXT DEFAULT ''");       // 2026/27
  add('matchday', 'INTEGER DEFAULT 0');   // 1–34, 0 = keiner

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_videos_season ON videos(season);
    CREATE INDEX IF NOT EXISTS idx_videos_competition ON videos(competition);
    CREATE INDEX IF NOT EXISTS idx_videos_team ON videos(team);
  `);

  db.exec('CREATE INDEX IF NOT EXISTS idx_videos_transcode ON videos(transcode_status)');

  setupSearchIndex();
}

/**
 * Volltextsuche.
 *
 * Vorher lief die Suche über `title LIKE '%wort%'`. Ein führendes Platzhalter-
 * zeichen schließt jeden Index aus, SQLite muss also jede Zeile anfassen — bei
 * ein paar hundert Videos unauffällig, bei ein paar zehntausend nicht mehr.
 * FTS5 kehrt das um und findet zusätzlich Wortanfänge.
 *
 * `content='videos'` heißt: der Index speichert die Texte nicht doppelt,
 * sondern verweist auf die Tabelle. Die Trigger halten beides zusammen.
 */
let searchIndexReady = false;

export function hasSearchIndex() {
  return searchIndexReady;
}

function setupSearchIndex() {
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS videos_fts USING fts5(
        title, description, content='videos', content_rowid='rowid'
      );

      CREATE TRIGGER IF NOT EXISTS videos_fts_insert AFTER INSERT ON videos BEGIN
        INSERT INTO videos_fts(rowid, title, description)
        VALUES (new.rowid, new.title, new.description);
      END;

      CREATE TRIGGER IF NOT EXISTS videos_fts_delete AFTER DELETE ON videos BEGIN
        INSERT INTO videos_fts(videos_fts, rowid, title, description)
        VALUES ('delete', old.rowid, old.title, old.description);
      END;

      CREATE TRIGGER IF NOT EXISTS videos_fts_update AFTER UPDATE ON videos BEGIN
        INSERT INTO videos_fts(videos_fts, rowid, title, description)
        VALUES ('delete', old.rowid, old.title, old.description);
        INSERT INTO videos_fts(rowid, title, description)
        VALUES (new.rowid, new.title, new.description);
      END;
    `);

    // Bestand nachtragen — beim ersten Start und nach einem Wiederaufbau.
    const indexed = db.prepare('SELECT COUNT(*) AS c FROM videos_fts').get().c;
    const total = db.prepare('SELECT COUNT(*) AS c FROM videos').get().c;
    if (indexed !== total) {
      db.exec("INSERT INTO videos_fts(videos_fts) VALUES('rebuild')");
      console.log(`[DB] Suchindex aufgebaut (${total} Videos)`);
    }

    searchIndexReady = true;
  } catch (err) {
    // Ohne FTS5 im SQLite-Build läuft die Suche weiter wie bisher.
    console.warn('[DB] Volltextsuche nicht verfügbar, weiche auf LIKE aus:', err.message);
    searchIndexReady = false;
  }
}

/**
 * Nutzereingabe in einen FTS5-Ausdruck übersetzen.
 *
 * Roh durchgereicht wäre die Eingabe eine Fehlerquelle: Zeichen wie " oder -
 * sind in FTS5 Syntax und lassen die Abfrage werfen. Jedes Wort wird deshalb
 * in Anführungszeichen gesetzt und mit * ergänzt, damit auch "Press" schon
 * "Pressekonferenz" findet.
 */
function toMatchQuery(input) {
  const tokens = String(input)
    .replace(/["*()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12);
  if (!tokens.length) return null;
  return tokens.map(t => `"${t}"*`).join(' ');
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

export function createVideo({
  id, userId, title, description, filename, thumbnailUrl, category, duration,
  transcodeStatus, visibility, team, competition, season, matchday,
}) {
  getDb().prepare(`
    INSERT INTO videos (
      id, user_id, title, description, filename, thumbnail_url, category, duration,
      transcode_status, visibility, team, competition, season, matchday
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, userId, title, description, filename, thumbnailUrl || '',
    category || 'General', duration || 0, transcodeStatus || 'skipped',
    visibility === 'internal' ? 'internal' : 'public',
    team || '', competition || '', season || '',
    Number.isFinite(Number(matchday)) ? Number(matchday) || 0 : 0
  );
  return getDb().prepare('SELECT * FROM videos WHERE id = ?').get(id);
}

// ── Aufbereitung ──────────────────────────────────────────────────────────────

export function setTranscodeStatus(id, status, error = '') {
  getDb().prepare('UPDATE videos SET transcode_status = ?, transcode_error = ? WHERE id = ?')
    .run(status, error || '', id);
}

/** Übernimmt, was ffprobe und ffmpeg herausgefunden haben. */
export function setVideoMedia(id, { hlsPath, duration, height, thumbnailUrl }) {
  getDb().prepare(`
    UPDATE videos SET
      hls_path      = COALESCE(?, hls_path),
      duration      = COALESCE(?, duration),
      height        = COALESCE(?, height),
      thumbnail_url = COALESCE(?, thumbnail_url)
    WHERE id = ?
  `).run(hlsPath ?? null, duration ?? null, height ?? null, thumbnailUrl ?? null, id);
}

/**
 * Alles, was beim letzten Lauf nicht fertig wurde. 'processing' zählt mit:
 * wer beim Neustart mittendrin war, ist es jetzt nicht mehr.
 */
export function getUnfinishedTranscodes() {
  return getDb().prepare(`
    SELECT * FROM videos
    WHERE transcode_status IN ('pending', 'processing')
    ORDER BY created_at ASC
  `).all();
}

export function getVideoById(id) {
  return getDb().prepare(`
    SELECT v.*, u.username, u.display_name, u.avatar_url,
           COALESCE(u.display_name, u.username, 'VfL Redaktion') AS uploader
    FROM videos v LEFT JOIN users u ON v.user_id = u.id
    WHERE v.id = ?
  `).get(id);
}

export function getVideosByUser(userId, { includeInternal = false } = {}) {
  return getDb().prepare(`
    SELECT v.*, u.username, u.display_name, u.avatar_url,
           COALESCE(u.display_name, u.username, 'VfL Redaktion') AS uploader
    FROM videos v LEFT JOIN users u ON v.user_id = u.id
    WHERE v.user_id = ?
      ${includeInternal ? '' : "AND v.visibility = 'public'"}
    ORDER BY v.created_at DESC
  `).all(userId);
}

export function getAllVideos({
  category, search, season, competition, team,
  limit = 50, offset = 0, forceLike = false, includeInternal = false,
} = {}) {
  const db = getDb();
  const params = [];

  let from = 'FROM videos v LEFT JOIN users u ON v.user_id = u.id';
  let where = includeInternal ? 'WHERE 1=1' : "WHERE v.visibility = 'public'";
  let order = 'ORDER BY v.created_at DESC';

  const match = search && searchIndexReady && !forceLike ? toMatchQuery(search) : null;

  if (match) {
    // Treffer zuerst nach Relevanz, bei Gleichstand das Neuere zuerst.
    from += ' JOIN videos_fts f ON f.rowid = v.rowid';
    where += ' AND videos_fts MATCH ?';
    params.push(match);
    order = 'ORDER BY f.rank, v.created_at DESC';
  } else if (season || competition) {
    // Im Archiv zählt der Spieltag, nicht der Uploadzeitpunkt: nachgereichte
    // Aufzeichnungen sollen nicht vor dem 34. Spieltag stehen.
    order = 'ORDER BY v.matchday DESC, v.created_at DESC';
  } else if (search) {
    where += ' AND (v.title LIKE ? OR v.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category && category !== 'All') {
    where += ' AND v.category = ?';
    params.push(category);
  }
  if (season)      { where += ' AND v.season = ?';      params.push(season); }
  if (competition) { where += ' AND v.competition = ?'; params.push(competition); }
  if (team)        { where += ' AND v.team = ?';        params.push(team); }

  params.push(limit, offset);

  const sql = `
    SELECT v.*, u.username, u.display_name, u.avatar_url,
           COALESCE(u.display_name, u.username, 'VfL Redaktion') AS uploader
    ${from}
    ${where}
    ${order}
    LIMIT ? OFFSET ?
  `;

  try {
    return db.prepare(sql).all(...params);
  } catch (err) {
    if (!match) throw err;
    // Sollte die Eingabe FTS5 doch zerlegen, lieber ein Ergebnis als ein Fehler.
    console.warn('[DB] Volltextsuche fehlgeschlagen, weiche auf LIKE aus:', err.message);
    return getAllVideos({
      category, search, season, competition, team,
      limit, offset, forceLike: true, includeInternal,
    });
  }
}

/**
 * Was im Bestand tatsächlich vorkommt — die Oberfläche soll keine leeren
 * Saisons oder Wettbewerbe anbieten, die noch nie befüllt wurden.
 */
export function getTaxonomy({ includeInternal = false } = {}) {
  const scope = includeInternal ? '' : "AND visibility = 'public'";
  const distinct = (column) => getDb().prepare(`
    SELECT ${column} AS value, COUNT(*) AS count
    FROM videos
    WHERE ${column} != '' ${scope}
    GROUP BY ${column}
    ORDER BY ${column} DESC
  `).all();

  return {
    seasons: distinct('season'),
    competitions: distinct('competition'),
    teams: distinct('team'),
  };
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
