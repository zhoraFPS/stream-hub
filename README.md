# 🎬 StreamHub - Local Network Low-Latency VOD Streaming Service

Ein extrem schneller, YouTube-ähnlicher VOD-Streaming-Dienst für das lokale Netzwerk, optimiert für den Betrieb auf einem **Intel NUC mit Proxmox VE**, LXC-Containern oder Docker.

---

## ⚡ Highlights & Features

- **Ultra Low-Latency VOD Streaming**: Nutzt HTTP `206 Partial Content` Range-Requests für sofortigen Wiedergabestart & verzögerungsfreies Spulen (< 50 ms).
- **Proxmox & Intel QuickSync Ready**: Inklusive GPU Passthrough (`/dev/dri`) für Hardware-Beschleunigung auf Intel NUCs.
- **YouTube Premium UI**: Dunkles High-End-Design mit Glassmorphism-Effekten, Video-Grid, Kategorien & Suchleiste.
- **Eigener HTML5 Video Player**: Play/Pause, Fast-Forward/Rewind mit Pfeiltasten, Lautstärke-Slider, Speed-Control (0.5x - 2.0x), Vollbild (F).
- **Drag & Drop Upload mit Auto-Thumbnailing**: Automatische Snapshot-Generierung aus dem Video (Frame bei 00:02) direkt im Browser.
- **Netzwerk-Freigabe & QR-Code**: Zeigt automatisch die lokale IP-Adresse im Heimnetz an (`http://192.168.x.x:5000`) inklusive QR-Code für Smart-TVs & Smartphones.
- **Interaktivität**: Kommentare, Like-Funktion & Merklisten.

---

## 🚀 Schnellstart (Lokal)

```bash
cd widgets/stream-hub

# 1. Abhängigkeiten installieren
npm install

# 2. Produktions-Build erstellen
npm run build

# 3. Server starten (lauscht im Netzwerk auf Port 5000)
npm run start
```

Besuche danach im Browser:
- **Auf diesem PC:** `http://localhost:5000`
- **Im lokalen Netz / Smart TV:** `http://<DEINE-NUC-IP>:5000`

---

## 🐳 Proxmox / Docker Deployment

Kopiere den Ordner `stream-hub` auf deinen Proxmox NUC (z. B. in einen Debian/Alpine LXC Container oder eine VM):

```bash
docker-compose up -d --build
```

> **Tipp für Proxmox LXC:** Stelle sicher, dass in den LXC Container Einstellungen Unprivileged=0 gewählt ist oder `/dev/dri/renderD128` durchgereicht ist, um maximale Intel QSV Performance zu erhalten.
