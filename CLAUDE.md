# CLAUDE.md — VfL Bochum Club-TV (stream-hub)

Du arbeitest an einer Streaming-Plattform die **1848TV** (vfl1848.tv) des VfL Bochum 1848
ersetzen soll. Das Ziel ist ein vollständiger Feature-Parität-Ersatz der aktuellen
Endava/Exozet White-Label-Plattform — damit der Verein 60.000 €/Jahr einspart.

---

## Dein erster Schritt — IMMER

**Lies die Repo, bevor du irgendetwas tust.**

```
1. Lese alle Dateien in diesem Repo (package.json, alle Source-Files, DB-Schema, Config)
2. Gleiche den Code gegen die Feature-Checkliste unten ab
3. Markiere jeden Feature-Punkt als: DONE / PARTIAL / MISSING
4. Gib eine kurze Zusammenfassung was du gefunden hast
5. Frage nach dem nächsten Schritt — oder starte mit dem ersten MISSING-Feature
```

Keine Annahmen. Keine Vermutungen. Code lesen, dann handeln.

---

## Kontext

- **Stack:** Node.js + npm (kein Framework vorgegeben — aus Repo ermitteln)
- **Läuft auf:** Intel NUC (lokal), soll auf Hetzner-Server deployed werden
- **Auth/Billing:** Wird über **VfL.ID** (Unidy OAuth) abgewickelt — noch nicht
  integriert, erstmal **Platzhalter** bauen (alle Inhalte zugänglich, Paywall kommt später)
- **CDN:** Bunny.net (oder aus Repo ermitteln was bereits konfiguriert ist)
- **Bereits funktionierend laut Entwickler:** Live-Ingest, Video-Upload, VOD-Player,
  Livestream-Player, Datenbank

---

## Feature-Checkliste (54 Features aus Live-Analyse von vfl1848.tv)

Gehe diese Liste durch und markiere jeden Punkt nach Code-Analyse:
- ✅ DONE — vollständig implementiert
- 🔶 PARTIAL — teilweise vorhanden, braucht Arbeit
- ❌ MISSING — nicht vorhanden, muss gebaut werden

### Content-Struktur & Navigation

- [ ] **Kategorien / Sektionen** — Bundesliga, Frauen, Anne Castroper, Talentwerk,
      Testspiele, DFB-Pokal, Podcast, eSports — je Saison verschachtelt
- [ ] **Saisonbasierte Unterkategorien** — z.B. Bundesliga 2025/26, 2024/25 —
      separate Playlisten pro Saison
- [ ] **Playlist / Video-Liste** — Zusammengehörige Videos in einer Playlist
      (z.B. alle Trainingslager-Videos); Route: `/playlist/:id`
- [ ] **Spiel-Detailseite** — Spiel mit Metadaten: Heim/Auswärts, Spieltag,
      Gegner, zugehörige Playlist; Route: `/game/:id`
- [ ] **Video-Detailseite** — Einzelvideo mit Titel, Datum, Beschreibung, Player;
      Route: `/video/:id`
- [ ] **Livestream-Seite** — Separate Route für laufende Live-Streams;
      Route: `/livestream/:id`
- [ ] **Startseite mit Hero + Sektions-Vorschauen** — Aktuellstes Video prominent,
      darunter je Kategorie die letzten 4 Videos
- [ ] **Suchfunktion** — Volltextsuche über Videotitel; Route: `/search?q=`
- [ ] **Tag-basierte Suche** — Videos nach Tags filterbar; Route: `/search/tag/:id`

### Player & Wiedergabe

- [ ] **HLS-Player (adaptive Bitrate)** — hls.js oder Video.js, 3 Qualitätsstufen
- [ ] **Paywall / Content-Lock** — Platzhalter zunächst: alle Inhalte zugänglich,
      Lock-UI vorbereiten für spätere VfL.ID-Integration
- [ ] **Kostenlose Videos (ohne Login)** — bestimmte Videos öffentlich
- [ ] **Registriert-Stufe** — Videopodcasts nach kostenloser Registrierung sichtbar
      (Zwischenstufe — Platzhalter genügt)
- [ ] **Chromecast / AirPlay** — Cast-Button im Player
- [ ] **Vollbild-Modus** — Standard-Player-Feature
- [ ] **Qualitätsstufen wählbar** — manuell zwischen 1080p/720p/480p

### Auth & Abonnement (Platzhalter — VfL.ID kommt später)

- [ ] **Login-Platzhalter** — Login-Button vorhanden, verlinkt auf VfL.ID;
      intern: alle Inhalte erstmal offen, Session-Middleware vorbereitet
- [ ] **Mehrere Abo-Laufzeiten** — UI-Platzhalter: Monat / Quartal / Jahr
- [ ] **Auto-Renewal-Hinweis** — 14-Tage-Kündigungsfrist im Text
- [ ] **Gutschein-Codes** — UI-Platzhalter im Checkout
- [ ] **Profil / Meine Daten** — Seite mit Platzhalter-Daten, Felder vorbereitet
- [ ] **Abo kündigen (Self-Service)** — Button + Kontaktformular-Link
- [ ] **Support-E-Mail** — support@vfl-bochum.de verlinkt

### Live-Streaming

- [ ] **Live-Ingest (RTMP)** — OBS → nginx-RTMP → Server ✓ (laut Entwickler done)
- [ ] **HLS-Packaging & CDN-Auslieferung** — .m3u8 → Bunny.net ✓ (laut Entwickler done)
- [ ] **Pressekonferenzen live** — PK als Live-Stream-Typ (Kategorisierung)
- [ ] **Testspiele live** — Vollspiele live (Hauptanwendungsfall)
- [ ] **U19/U17/Frauen live** — Nachwuchs/Frauen als Stream-Typ
- [ ] **Stream-Archivierung** — Live-Stream wird nach Ende automatisch als VOD gespeichert

### VOD-Inhalte & CMS

- [ ] **Video-Upload & Encoding** — Upload → FFmpeg → HLS ✓ (laut Entwickler done)
- [ ] **Spiele in voller Länge** — Bundesliga/Pokal nach Abpfiff, kein Live
- [ ] **Highlight-Videos** — kommentierte Zusammenfassungen
- [ ] **Interviews** — Kurzvideos nach Spielen/Training
- [ ] **Pressekonferenz-Aufzeichnungen** — PK vor/nach Spielen als VOD
- [ ] **Trainingslager-Vlogs / Behind-the-Scenes** — Serien aus Trainingslagern
- [ ] **Video-Podcast** — längere Gesprächsformate (MeinVfL-Podcast)
- [ ] **Spielerportraits** — Kurzformat-Videos (Tach-Videos, Sach ma schnell)
- [ ] **Historisches Archiv** — Kategorie für ältere Inhalte
- [ ] **eSports-Content** — eigene Kategorie
- [ ] **Thumbnails** — Vorschaubild pro Video
- [ ] **Veröffentlichungsdatum** — Datum im Listing sichtbar

### Admin / CMS

- [ ] **Video hochladen** — mit Titel, Beschreibung, Kategorie, Zugangsstufe, Thumbnail
- [ ] **Video bearbeiten / löschen**
- [ ] **Kategorie anlegen / bearbeiten**
- [ ] **Live-Stream anlegen** — Titel, geplante Startzeit, Stream-Key generieren
- [ ] **Encoding-Status** — Transcoding läuft / fertig / Fehler anzeigen
- [ ] **Admin-Bereich geschützt** — separates Admin-Login oder Flag

### Sponsoren & Branding

- [ ] **Sponsor-Banner im Header** — Sparkasse Bochum (Presenting-Sponsor),
      konfigurierbarer Link
- [ ] **Sponsor-Logos im Footer** — bis zu 9 Logos, konfigurierbar
- [ ] **VfL-Branding** — Vereinsfarben (Blau #003E7E, Weiß), Vereinslogo

### Technisch / Pflicht

- [ ] **Responsive Design (Mobile-first)** — Smartphone, Tablet, Desktop
- [ ] **Cookie-Banner (DSGVO)** — gesetzlich Pflicht
- [ ] **Datenschutzerklärung + Impressum** — kann auf vfl-bochum.de verlinken
- [ ] **Nutzungsbedingungen** — 14-Tage-Kündigungsfrist, Auto-Renewal
- [ ] **Social-Media-Links im Footer** — Facebook, Instagram, X, YouTube, LinkedIn, TikTok
- [ ] **Fehlerseiten** — 404, Stream offline, Paywall

---

## Datenbankschema (Ziel)

Falls das Schema noch nicht vollständig ist — hier das Zielschema:

```sql
-- Videos
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INT REFERENCES categories(id),
  playlist_id INT REFERENCES playlists(id),
  published_at TIMESTAMP,
  thumbnail_url TEXT,
  hls_url TEXT,
  duration_seconds INT,
  access_level VARCHAR(20) DEFAULT 'subscriber', -- 'public' | 'registered' | 'subscriber'
  is_live BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Kategorien (verschachtelt für Saisons)
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  parent_id INT REFERENCES categories(id),
  season VARCHAR(10),   -- '2025/26'
  sort_order INT DEFAULT 0
);

-- Playlisten
CREATE TABLE playlists (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category_id INT REFERENCES categories(id),
  cover_image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Spiele
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  home_team VARCHAR(100),
  away_team VARCHAR(100),
  matchday INT,
  played_at TIMESTAMP,
  competition VARCHAR(100),
  playlist_id INT REFERENCES playlists(id)
);

-- Tags
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE video_tags (
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, tag_id)
);

-- Sponsoren (konfigurierbar)
CREATE TABLE sponsors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  logo_url TEXT,
  link_url TEXT,
  position VARCHAR(50),  -- 'header' | 'footer'
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true
);
```

---

## Infrastruktur-Zielarchitektur

```
[OBS / Kamera]
      |
      | RTMP :1935
      v
[Hetzner Server]
  nginx-RTMP → FFmpeg
  3 HLS-Qualitätsstufen: 1080p / 720p / 480p
  VOD-Transcoding nach Upload
      |
      | HLS (.m3u8 + .ts)
      v
[Bunny.net CDN]
  Pull-Zone → Origin
  Storage-Bucket für VOD
      |
      v
[Browser / Apps]
  hls.js Player
```

**Cache-Header — KRITISCH:**
```
HLS-Segmente (.ts):  Cache-Control: max-age=86400
HLS-Playlisten (.m3u8): Cache-Control: max-age=2
```
Falsch gesetzt → CDN cacht nichts oder liefert veraltete Streams.

---

## Arbeitsweise

- **Keine Annahmen.** Datei lesen, dann handeln.
- **Bugs fixen wenn du sie siehst** — nicht skippen, nicht "TODO" hinterlassen.
- **Eine Sache auf einmal.** Feature fertig (inkl. Tests wo sinnvoll), dann nächstes.
- **Paywall = Platzhalter.** `access_level`-Feld in DB anlegen, UI-Lock vorbereiten,
  aber keine Zugriffskontrolle erzwingen — VfL.ID-Integration kommt später.
- **Vor jeder neuen Datei:** Prüfen ob eine ähnliche bereits existiert.
- **Kein Over-Engineering.** Wenn etwas einfach gelöst werden kann, einfach lösen.

---

## Wenn du fertig mit der Analyse bist

Gib aus:

```
## Analyse-Ergebnis

### Stack
[Was du gefunden hast]

### DONE (X Features)
- Feature Name

### PARTIAL (X Features)
- Feature Name — was fehlt

### MISSING (X Features)
- Feature Name

### Empfohlener nächster Schritt
[Konkret — welches Feature als nächstes, warum]
```

Dann warte auf Bestätigung bevor du anfängst zu coden.
