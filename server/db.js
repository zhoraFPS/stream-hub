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

    -- Geplante Übertragungen. Getrennt von live_sessions: dort steht, was
    -- tatsächlich lief, hier was vorgesehen ist. Beides kann auseinandergehen —
    -- ein angekündigtes Spiel fällt aus, ein Stream startet spontan.
    CREATE TABLE IF NOT EXISTS scheduled_streams (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL,
      title         TEXT    NOT NULL,
      description   TEXT    DEFAULT '',
      scheduled_for TEXT    NOT NULL,
      team          TEXT    DEFAULT '',
      competition   TEXT    DEFAULT '',
      season        TEXT    DEFAULT '',
      matchday      INTEGER DEFAULT 0,
      status        TEXT    DEFAULT 'planned',  -- planned | live | done | cancelled
      video_id      TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_scheduled_time ON scheduled_streams(scheduled_for);
    CREATE INDEX IF NOT EXISTS idx_scheduled_status ON scheduled_streams(status);

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

  const userColumns = new Set(db.prepare('PRAGMA table_info(users)').all().map(c => c.name));
  if (!userColumns.has('role')) {
    // viewer = darf zusehen, editor = darf hochladen und senden, admin = darf alles
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'viewer'");
    // Bestandskonten waren bisher uneingeschränkt — Rechte nicht still wegnehmen.
    db.exec("UPDATE users SET role = 'admin'");
    console.log('[DB] Spalte users.role ergänzt, Bestandskonten als admin übernommen');
  }

  // Das Upload-Formular schickt Schlagworte seit jeher mit, der Server hat sie
  // nie gelesen. Jetzt werden sie wenigstens aufbewahrt.
  add('tags', "TEXT DEFAULT ''");

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

export function createUser({ username, email, passwordHash, role }) {
  const db = getDb();
  const streamKey = randomUUID().replace(/-/g, '');
  const stmt = db.prepare(`
    INSERT INTO users (username, email, password_hash, stream_key, display_name, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(username, email, passwordHash, streamKey, username, role || 'viewer');
  return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
}

// ── Rollen ────────────────────────────────────────────────────────────────────

export const ROLES = ['viewer', 'editor', 'admin'];

/** Rangfolge, damit sich Rechte vergleichen lassen statt aufzuzählen. */
const RANK = { viewer: 0, editor: 1, admin: 2 };

export function roleAtLeast(role, minimum) {
  return (RANK[role] ?? -1) >= (RANK[minimum] ?? 99);
}

export function countUsers() {
  return getDb().prepare('SELECT COUNT(*) AS c FROM users').get().c;
}

export function listUsers() {
  return getDb().prepare(`
    SELECT id, username, email, display_name, role, created_at
    FROM users ORDER BY id ASC
  `).all();
}

export function setUserRole(userId, role) {
  if (!ROLES.includes(role)) return false;
  return getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId).changes > 0;
}

export function deleteUser(userId) {
  return getDb().prepare('DELETE FROM users WHERE id = ?').run(userId).changes > 0;
}

/** Wie viele Konten dürfen noch verwalten — schützt vor dem letzten Adminverlust. */
export function countAdmins() {
  return getDb().prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
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
  transcodeStatus, visibility, team, competition, season, matchday, tags,
}) {
  getDb().prepare(`
    INSERT INTO videos (
      id, user_id, title, description, filename, thumbnail_url, category, duration,
      transcode_status, visibility, team, competition, season, matchday, tags
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, userId, title, description, filename, thumbnailUrl || '',
    category || 'General', duration || 0, transcodeStatus || 'skipped',
    visibility === 'internal' ? 'internal' : 'public',
    team || '', competition || '', season || '',
    Number.isFinite(Number(matchday)) ? Number(matchday) || 0 : 0,
    tags || ''
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
// ── Geplante Übertragungen ────────────────────────────────────────────────────

const SCHEDULE_SELECT = `
  SELECT s.*, u.username, u.display_name,
         COALESCE(u.display_name, u.username) AS uploader
  FROM scheduled_streams s LEFT JOIN users u ON s.user_id = u.id
`;

export function createSchedule({ userId, title, description, scheduledFor, team, competition, season, matchday }) {
  const result = getDb().prepare(`
    INSERT INTO scheduled_streams
      (user_id, title, description, scheduled_for, team, competition, season, matchday)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId, title, description || '', scheduledFor,
    team || '', competition || '', season || '',
    Number(matchday) || 0
  );
  return getScheduleById(result.lastInsertRowid);
}

export function getScheduleById(id) {
  return getDb().prepare(`${SCHEDULE_SELECT} WHERE s.id = ?`).get(id);
}

/**
 * Was noch aussteht. `graceMinutes` hält eine gerade begonnene Übertragung in
 * der Liste — sonst verschwände die Ankündigung genau dann, wenn sie zählt.
 */
export function getUpcomingSchedules({ graceMinutes = 240, limit = 20 } = {}) {
  const grenze = new Date(Date.now() - graceMinutes * 60000).toISOString();
  return getDb().prepare(`
    ${SCHEDULE_SELECT}
    WHERE s.status IN ('planned', 'live') AND s.scheduled_for >= ?
    ORDER BY s.scheduled_for ASC
    LIMIT ?
  `).all(grenze, limit);
}

/** Vollständige Liste für die Redaktion, auch Vergangenes. */
export function listSchedules({ limit = 100 } = {}) {
  return getDb().prepare(`${SCHEDULE_SELECT} ORDER BY s.scheduled_for DESC LIMIT ?`).all(limit);
}

export function updateSchedule(id, felder = {}) {
  getDb().prepare(`
    UPDATE scheduled_streams SET
      title         = COALESCE(?, title),
      description   = COALESCE(?, description),
      scheduled_for = COALESCE(?, scheduled_for),
      team          = COALESCE(?, team),
      competition   = COALESCE(?, competition),
      season        = COALESCE(?, season),
      matchday      = COALESCE(?, matchday),
      status        = COALESCE(?, status),
      video_id      = COALESCE(?, video_id)
    WHERE id = ?
  `).run(
    felder.title ?? null,
    felder.description ?? null,
    felder.scheduledFor ?? null,
    felder.team ?? null,
    felder.competition ?? null,
    felder.season ?? null,
    felder.matchday === undefined ? null : Number(felder.matchday) || 0,
    felder.status ?? null,
    felder.videoId ?? null,
    id
  );
  return getScheduleById(id);
}

export function deleteSchedule(id) {
  return getDb().prepare('DELETE FROM scheduled_streams WHERE id = ?').run(id).changes > 0;
}

/**
 * Die Ankündigung zu einer gerade startenden Übertragung finden.
 *
 * Gesucht wird die zeitlich nächstgelegene Planung dieses Kontos innerhalb
 * eines Fensters um jetzt. Dadurch erbt der Mitschnitt Titel und Einordnung,
 * statt „Aufzeichnung vom 04.08.2026" zu heißen. Ohne Fenster würde eine
 * Planung von nächster Woche einen spontanen Test heute vereinnahmen.
 */
export function findScheduleForStart(userId, { windowHours = 6 } = {}) {
  const spanne = windowHours * 3600000;
  const von = new Date(Date.now() - spanne).toISOString();
  const bis = new Date(Date.now() + spanne).toISOString();

  return getDb().prepare(`
    SELECT * FROM scheduled_streams
    WHERE user_id = ? AND status = 'planned'
      AND scheduled_for BETWEEN ? AND ?
    ORDER BY ABS(julianday(scheduled_for) - julianday('now')) ASC
    LIMIT 1
  `).get(userId, von, bis);
}

/** Alle belegten Dateinamen — für den Abgleich mit dem, was auf der Platte liegt. */
export function videoFilenames() {
  return new Set(
    getDb().prepare("SELECT filename FROM videos WHERE filename != ''").all().map(r => r.filename)
  );
}

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

/**
 * Metadaten ändern.
 *
 * COALESCE statt fester Werte: der Aufruf schickt nur, was sich ändern soll,
 * alles Übrige bleibt stehen. Datei, Aufrufe und Aufbereitungsstand sind
 * bewusst nicht änderbar — die gehören dem Server, nicht dem Formular.
 */
export function updateVideo(id, felder = {}) {
  const zahl = (v) => (v === undefined || v === null || v === '' ? null : Number(v) || 0);

  getDb().prepare(`
    UPDATE videos SET
      title       = COALESCE(?, title),
      description = COALESCE(?, description),
      category    = COALESCE(?, category),
      visibility  = COALESCE(?, visibility),
      team        = COALESCE(?, team),
      competition = COALESCE(?, competition),
      season      = COALESCE(?, season),
      matchday    = COALESCE(?, matchday),
      tags        = COALESCE(?, tags)
    WHERE id = ?
  `).run(
    felder.title ?? null,
    felder.description ?? null,
    felder.category ?? null,
    felder.visibility === 'internal' || felder.visibility === 'public' ? felder.visibility : null,
    felder.team ?? null,
    felder.competition ?? null,
    felder.season ?? null,
    zahl(felder.matchday),
    felder.tags ?? null,
    id
  );

  return getVideoById(id);
}

export function incrementVideoViews(id) {
  getDb().prepare('UPDATE videos SET views = views + 1 WHERE id = ?').run(id);
}

/**
 * `userId` grenzt auf die eigenen Videos ein. Wer bereits berechtigt ist —
 * etwa die Verwaltung bei fremden Videos — ruft ohne auf; sonst liefe das
 * Löschen ins Leere und meldete trotzdem Erfolg.
 */
export function deleteVideo(id, userId = null) {
  const stmt = userId === null
    ? getDb().prepare('DELETE FROM videos WHERE id = ?')
    : getDb().prepare('DELETE FROM videos WHERE id = ? AND user_id = ?');
  const result = userId === null ? stmt.run(id) : stmt.run(id, userId);
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
