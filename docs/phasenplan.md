# VfL Bochum Club-TV — Eigenentwicklung Phasenplan
**Handoff-Dokument für Claude Code**

---

## Kontext & Ziel

Der VfL Bochum 1848 betreibt aktuell **1848TV** (vfl1848.tv) über den externen Dienstleister **Endava GmbH** (ehemals Exozet) als White-Label-OTT-Plattform zum Preis von **60.000 €/Jahr**.

Ziel ist der Aufbau einer vollständigen Eigenentwicklung (Streaming + VOD + CMS) um diesen Vertrag langfristig zu ersetzen und ca. **56.000–58.000 €/Jahr** einzusparen.

**Auth, Abo-Verwaltung und Billing laufen bereits über die VfL.ID** (Unidy-basiertes SSO-System). Diese Komponenten werden **nicht** neu gebaut — die Plattform integriert sich via OAuth in die bestehende VfL.ID.

**Wer baut es:** IT-Auszubildender beim VfL Bochum. Die IT-Abteilung soll nach Fertigstellung eingewiesen werden und den Betrieb übernehmen.

**Aktueller Stand:** Grundlegende Plattform läuft bereits lokal auf einem Intel NUC. Dieser Plan beschreibt den Weg von dort zur produktionsreifen Plattform.

---

## Infrastruktur-Zielarchitektur

```
[OBS / Kamera-Encoder]
        |
        | RTMP
        v
[Hetzner Server — nginx-RTMP + FFmpeg]
  - Live-Ingest & Transcoding
  - HLS-Packaging (3 Qualitätsstufen: 1080p, 720p, 480p)
  - VOD-Encoding nach Upload
        |
        | HLS (.m3u8 + .ts Segmente)
        v
[Bunny.net CDN]
  - Edge-Auslieferung EU
  - Separater Storage-Bucket für VOD-Archiv
        |
        v
[Endnutzer — Web / iOS / Android / Smart TV]
  hls.js Player im Browser
  Native Apps Phase 2
```

**DRM:** Widevine (Chrome/Android) + FairPlay (Safari/iOS) via Pallycon oder BuyDRM — Phase 2.

**Auth-Flow:**
```
User klickt Login
  → Redirect zu VfL.ID (Unidy OAuth)
  → Callback mit Token
  → Backend prüft: Hat User aktives Abo? (VfL.ID API)
  → Ja → Session + Zugang zu Locked Content
  → Nein → Abo-Abschluss-Seite (VfL.ID)
```

---

## Feature-Katalog (aus Live-Analyse von vfl1848.tv)

Vollständige Liste aller 54 identifizierten Features, gruppiert nach Phase.

### Zugangsstufen (3 Ebenen)
| Stufe | Zugang | Inhalte |
|---|---|---|
| Öffentlich | Ohne Login | Ausgewählte Teaser, Startseite |
| Registriert | Kostenlose VfL.ID | Videopodcasts (MeinVfL-Podcast) |
| Abonnent | Bezahltes Abo via VfL.ID | Alle Spiele, Highlights, Live-Streams |

---

## Phase 1 — PoC / MVP (Ziel: interner Präsentations-Ready)

**Zeitrahmen:** 4–8 Wochen  
**Infrastruktur:** Hetzner CX32 (4 vCPU, 8 GB RAM, ~13 €/Monat)

### 1.1 Infrastruktur aufsetzen

- [ ] Hetzner-Server provisionieren (Ubuntu 22.04 LTS)
- [ ] nginx mit RTMP-Modul kompilieren und konfigurieren
- [ ] FFmpeg installieren für Live-Transcoding (3 Qualitätsstufen)
- [ ] HLS-Output-Pfad konfigurieren: `/hls/live/stream_1080p.m3u8` etc.
- [ ] Bunny.net CDN einrichten — Pull-Zone auf Hetzner-Origin zeigen
- [ ] Hetzner Object Storage (S3-kompatibel) für VOD-Archiv einrichten
- [ ] SSL/HTTPS via Let's Encrypt (Certbot)
- [ ] Firewall-Regeln: Port 1935 (RTMP), 80/443 (HTTP/S), 22 (SSH)

**nginx-RTMP Grundkonfiguration:**
```nginx
rtmp {
    server {
        listen 1935;
        chunk_size 4096;

        application live {
            live on;
            record off;

            exec ffmpeg -i rtmp://localhost/live/$name
              -c:v libx264 -preset veryfast -b:v 5000k -s 1920x1080
              -c:a aac -b:a 128k
              -hls_time 4 -hls_list_size 10 -hls_flags delete_segments
              -f hls /var/www/hls/$name_1080p.m3u8

              -c:v libx264 -preset veryfast -b:v 2500k -s 1280x720
              -c:a aac -b:a 128k
              -hls_time 4 -hls_list_size 10 -hls_flags delete_segments
              -f hls /var/www/hls/$name_720p.m3u8

              -c:v libx264 -preset veryfast -b:v 800k -s 854x480
              -c:a aac -b:a 96k
              -hls_time 4 -hls_list_size 10 -hls_flags delete_segments
              -f hls /var/www/hls/$name_480p.m3u8;
        }
    }
}
```

### 1.2 Backend (REST API)

**Stack-Empfehlung:** Node.js (Express) oder Python (FastAPI) — je nach Kenntnisstand.

- [ ] Projekt-Setup mit TypeScript (empfohlen) oder Python
- [ ] Datenbankschema (PostgreSQL empfohlen):

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
  hls_url TEXT,           -- CDN-URL der m3u8
  duration_seconds INT,
  access_level VARCHAR(20) DEFAULT 'subscriber', -- 'public' | 'registered' | 'subscriber'
  is_live BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Kategorien
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,  -- 'bundesliga', 'frauen', 'testspiele' etc.
  name VARCHAR(255) NOT NULL,
  parent_id INT REFERENCES categories(id),  -- für Saison-Unterkategorien
  season VARCHAR(10),                        -- '2025/26'
  sort_order INT DEFAULT 0
);

-- Playlisten (zusammengehörige Videos, z.B. Trainingslager)
CREATE TABLE playlists (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category_id INT REFERENCES categories(id),
  cover_image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Spiele (für Spiel-Detailseiten)
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  home_team VARCHAR(100),
  away_team VARCHAR(100),
  matchday INT,
  played_at TIMESTAMP,
  competition VARCHAR(100),   -- 'Bundesliga', 'DFB-Pokal', 'Testspiel'
  playlist_id INT REFERENCES playlists(id)
);

-- Tags
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE video_tags (
  video_id UUID REFERENCES videos(id),
  tag_id INT REFERENCES tags(id),
  PRIMARY KEY (video_id, tag_id)
);
```

- [ ] API-Endpunkte implementieren:

```
GET  /api/videos                    — Liste (mit Filter: category, playlist, access_level)
GET  /api/videos/:id                — Einzelnes Video
GET  /api/videos/search?q=          — Volltextsuche (Titel)
GET  /api/videos/search/tag/:tagId  — Tag-Filter

GET  /api/categories                — Alle Kategorien (mit Unterkategorien)
GET  /api/categories/:slug          — Kategorie + ihre Videos

GET  /api/playlists/:id             — Playlist + Videos
GET  /api/games/:id                 — Spiel-Detailseite + Playlist

GET  /api/livestreams/active        — Aktive Live-Streams
POST /api/livestreams               — (Admin) Live-Stream anlegen

POST /api/admin/videos/upload       — (Admin) Video hochladen + Transcoding triggern
PUT  /api/admin/videos/:id          — (Admin) Video-Metadaten bearbeiten
DELETE /api/admin/videos/:id        — (Admin) Video löschen
```

- [ ] VfL.ID OAuth-Integration:
  - OAuth 2.0 Authorization Code Flow gegen Unidy
  - Callback-Handler: Token validieren, Abo-Status prüfen
  - Session-Management (JWT oder Server-Side Session)
  - Middleware: `requireSubscriber`, `requireRegistered`, `requireAdmin`

- [ ] VOD-Upload-Pipeline:
  - Multipart-Upload → temporärer lokaler Speicher
  - FFmpeg-Job: Transcoding zu 3 HLS-Varianten
  - Upload der .m3u8 + .ts Dateien zu Bunny.net Object Storage
  - Datenbank-Eintrag anlegen

### 1.3 Frontend (Web)

**Stack-Empfehlung:** Next.js (React) — SSR für SEO, bewährtes Ökosystem.

- [ ] Projekt-Setup: `npx create-next-app@latest vfl-tv --typescript`
- [ ] VfL Bochum Branding: Blau (#0047AB oder Vereinsfarbe verifizieren), Weiß, Schriftart

**Seiten (Routes):**

- [ ] `/` — Startseite
  - Hero: Aktuellstes Video prominent
  - Sektions-Vorschauen: je Hauptkategorie die letzten 4 Videos
  - Sponsor-Banner (Sparkasse Bochum) im Header

- [ ] `/category/[slug]` — Kategorie-Seite
  - Unterkategorien (Saisons) als Tabs/Filter
  - Video-Grid mit Thumbnail, Titel, Datum, Lock-Icon wenn Abo nötig

- [ ] `/playlist/[id]` — Playlist-Seite
  - Video-Liste mit Seitennavigation

- [ ] `/video/[id]` — Video-Detailseite
  - HLS-Player (hls.js)
  - Paywall-Overlay wenn kein Abo
  - Thumbnail, Titel, Datum, Beschreibung

- [ ] `/game/[id]` — Spiel-Detailseite
  - Heim/Auswärts, Spieltag, Wettbewerb
  - Zugehörige Playlist-Videos

- [ ] `/livestream/[id]` — Live-Stream-Seite
  - Latenz-optimierter HLS-Player
  - "LIVE"-Badge

- [ ] `/search` — Suche
  - Volltextsuche über Videotitel
  - Ergebnisliste mit Thumbnails

- [ ] `/login` — VfL.ID OAuth-Redirect

- [ ] `/profil` — Meine Daten
  - Anzeige: Name, E-Mail, Abo-Status
  - Link zu VfL.ID für Änderungen

- [ ] Globale Komponenten:
  - Header mit Navigation (Kategorien als Dropdown-Menü)
  - Footer mit Sponsor-Logos, rechtlichen Links
  - Cookie-Banner (DSGVO-konform)
  - Lock-Icon auf gesperrten Videos

**HLS-Player (hls.js):**
```jsx
import Hls from 'hls.js';
import { useEffect, useRef } from 'react';

export function VideoPlayer({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
      return () => hls.destroy();
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari — natives HLS
      videoRef.current.src = src;
    }
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      poster={poster}
      style={{ width: '100%', aspectRatio: '16/9', background: '#000' }}
    />
  );
}
```

### 1.4 Admin-Panel (Minimal)

Für den PoC reicht ein einfaches Admin-Interface — kein vollständiges CMS.

- [ ] `/admin` — geschützt via Admin-Flag in VfL.ID oder separates Admin-Passwort
- [ ] Video hochladen (Titel, Beschreibung, Kategorie, Zugangsstufe, Thumbnail)
- [ ] Video bearbeiten / löschen
- [ ] Kategorie anlegen / bearbeiten
- [ ] Live-Stream anlegen (Titel, geplante Startzeit, Stream-Key generieren)
- [ ] Video-Liste mit Status (Transcoding läuft / fertig / Fehler)

### 1.5 Rechtliches (Pflicht für PoC-Präsentation)

- [ ] Impressum (kann auf vfl-bochum.de verlinken)
- [ ] Datenschutzerklärung (DSGVO — Video-Tracking, Cookies, VfL.ID)
- [ ] Nutzungsbedingungen (inkl. 14-Tage-Kündigungsfrist, Auto-Renewal)
- [ ] Cookie-Consent-Banner

---

## Phase 2 — Produktionsreife

**Zeitrahmen:** 2–4 Monate nach Phase 1  
**Voraussetzung:** Grünes Licht vom Verein nach PoC-Präsentation

### 2.1 DRM-Integration

- [ ] **Widevine** (Chrome, Android, FireTV, SmartTV):
  - Pallycon oder BuyDRM als Key Server (~100 €/Monat)
  - HLS + Widevine CENC-Verschlüsselung in FFmpeg
  - EME (Encrypted Media Extensions) im Player

- [ ] **FairPlay** (Safari, iOS, Apple TV):
  - Apple FairPlay Streaming Zertifikat beantragen (kostenlos via Apple Developer Account)
  - FairPlay-License-Server in Backend implementieren
  - AVPlayer-Integration in iOS App

- [ ] DRM ohne Apps: Im Browser über hls.js mit EME — funktioniert für Widevine in Chrome/Firefox, FairPlay nur in Safari

### 2.2 Mobile Apps

- [ ] **iOS App** (Swift / React Native):
  - AVPlayer für HLS + FairPlay
  - VfL.ID Login via Safari-WebView / ASWebAuthenticationSession
  - Gleiche Seitenstruktur wie Web
  - App Store Submission

- [ ] **Android App** (Kotlin / React Native):
  - ExoPlayer für HLS + Widevine
  - VfL.ID Login via Chrome Custom Tab
  - Play Store Submission

**Empfehlung React Native:** Ein Codebase für beide Plattformen — sinnvoll wenn die IT-Abteilung das langfristig wartet.

### 2.3 Erweiterte Features

- [ ] **Gutschein-Codes** — Generierung + Einlösung (Backend-Logik, VfL.ID-seitig klären)
- [ ] **Mehrere Abo-Laufzeiten** — Monat / Quartal / Jahr, Preise von VfL.ID gesteuert
- [ ] **Stream-Archivierung** — Live-Stream wird nach Ende automatisch als VOD gespeichert
- [ ] **Qualitätsstufenwahl im Player** — manuell zwischen 1080p/720p/480p wechseln
- [ ] **Chromecast-Support** — `cast-video-src` via Google Cast SDK im Player
- [ ] **AirPlay-Support** — automatisch via `<video>` auf Safari/iOS
- [ ] **Sponsor-Banner-System** — konfigurierbares Banner-Slot-System für Presenting-Sponsoren
- [ ] **Analytics** — Viewerzahlen, Watch-Time, beliebteste Videos (eigene Postgres-Tabellen oder Plausible.io)
- [ ] **E-Mail-Benachrichtigungen** — "Neues Video in deiner Kategorie" (optional)

### 2.4 Infrastruktur-Härtung

- [ ] **Redundanter Ingest** — zweiter Backup-Server oder 5G-Failover für Live-Events
- [ ] **Monitoring** — Uptime-Kuma oder Grafana + Prometheus
  - Alert wenn Stream abbricht (Telegram/E-Mail)
  - Alert wenn Server-CPU > 80 % beim Live-Stream
- [ ] **Backup-Strategie** — täglicher Datenbank-Dump zu separatem Hetzner-Bucket
- [ ] **CDN-Failover** — Bunny.net Edge-Regeln für Origin-Ausfall
- [ ] **Rate-Limiting** — API-Schutz gegen Abuse

---

## Phase 3 — Nice-to-have (langfristig)

- [ ] **Smart TV Apps** (Fire TV, Apple TV, Tizen/WebOS) — eigene SDKs, aufwendig
- [ ] **Tag-basierte Suche** — `/search/tag/:id`
- [ ] **Historisches Archiv** — ältere Videos migrieren
- [ ] **eSports-Sektion** — wie gehabt eigene Kategorie
- [ ] **Multi-Bitrate-Qualitätswahl** — automatisch oder manuell im Player
- [ ] **Offline-Download** (iOS/Android) — DRM-geschützte Offline-Inhalte

---

## Infrastruktur-Kosten Zusammenfassung

| Posten | Anbieter | Kosten/Monat | Kosten/Jahr |
|---|---|---|---|
| Server (Transcoding + Origin) | Hetzner CX32 | ~13 € | ~156 € |
| CDN + Storage | Bunny.net | ~40–80 € | ~500–1.000 € |
| DRM (Phase 2) | Pallycon Starter | ~100 € | ~1.200 € |
| Monitoring | Uptime-Kuma (self-hosted) | 0 € | 0 € |
| SSL | Let's Encrypt | 0 € | 0 € |
| **Gesamt** | | **~153–193 €** | **~1.900–2.400 €** |
| | | | |
| **Endava aktuell** | | **5.000 €** | **60.000 €** |
| **Ersparnis** | | **~4.800 €** | **~57.600 €** |

---

## Offene Fragen / Klärungsbedarf

Vor Phase 2 mit dem Verein klären:

1. **VfL.ID API-Zugang** — Welche Endpunkte stehen intern zur Verfügung? Abo-Status-Check, User-Info, Webhook bei Kündigung?
2. **Abo-Preise** — Werden von VfL.ID gesteuert oder im neuen System selbst gepflegt?
3. **Gutschein-Logik** — Wer generiert Codes? VfL.ID oder eigenes System?
4. **Bestehende Abonnenten** — Migration von Endava-Abos zu VfL.ID nötig? (Wahrscheinlich läuft das schon über VfL.ID)
5. **Streaming-Equipment am Stadion** — Welcher Encoder wird verwendet (OBS, Hardware-Encoder)? Upload-Leitung im Stadion?
6. **Content-Migration** — Sollen die ~3.500 bestehenden Videos von 1848TV migriert werden?

---

## Tech-Stack Zusammenfassung

| Schicht | Technologie | Begründung |
|---|---|---|
| Server-OS | Ubuntu 22.04 LTS | Stabil, lange Support-Laufzeit |
| Live-Ingest | nginx-RTMP | Open Source, bewährt |
| Transcoding | FFmpeg | Standard, kostenlos |
| CDN | Bunny.net | Günstigste Option EU, ~0,005 €/GB |
| Storage (VOD) | Bunny.net Storage / Hetzner S3 | S3-kompatibel, günstig |
| DRM | Pallycon (Phase 2) | Widevine + FairPlay in einem |
| Backend | Node.js + Express + TypeScript | Oder FastAPI (Python) |
| Datenbank | PostgreSQL (Hetzner Managed DB) | Zuverlässig, SQL |
| Frontend | Next.js (React) | SSR, SEO, gutes Ökosystem |
| Player | hls.js | Open Source, bewährt |
| iOS App (P2) | React Native | Code-Sharing mit Android |
| Android App (P2) | React Native | Code-Sharing mit iOS |
| Monitoring | Uptime-Kuma | Self-hosted, kostenlos |
| Auth | VfL.ID (Unidy OAuth) | Bereits vorhanden — nicht neu bauen |

---

## Hinweise für Claude Code

- **Immer verifizieren bevor implementieren** — keine Annahmen über VfL.ID API-Struktur, erst Dokumentation lesen oder mit dem Team klären
- **DRM ist komplex** — FairPlay benötigt zwingend einen Apple Developer Account und ein valides Zertifikat; nicht ohne das starten
- **nginx-RTMP vs. Ant Media Server** — Falls nginx-RTMP-Konfiguration zu komplex wird, ist Ant Media Server Community Edition (kostenlos, Open Source) eine saubere Alternative mit Web-UI
- **Segment-Caching für CDN** — HLS-Segmente (.ts) müssen lange Cache-Header bekommen (`Cache-Control: max-age=86400`), Playlists (.m3u8) kurze (`Cache-Control: max-age=2`) — sonst cacht das CDN nichts oder alles falsch
- **RTMP-Stream-Key** — beim PoC einfacher fixer Key, in Produktion pro-Event generierter Key mit Ablaufzeit
- **Fehlerfall Live-Stream** — Player muss sauber auf "Stream nicht verfügbar" reagieren, kein weißes Rechteck
