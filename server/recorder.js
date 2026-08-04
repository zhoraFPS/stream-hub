import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Mitschnitt laufender OBS-Streams.
 *
 * Handy-Streams laufen über unseren WebSocket und wurden schon immer in eine
 * Datei geschrieben. OBS-Streams gehen dagegen direkt an MediaMTX — nach dem
 * Abpfiff war die Übertragung damit weg. Für ein Testspiel, das genau deshalb
 * übertragen wird, ist das der schlechteste Zeitpunkt zum Feststellen.
 *
 * Statt neu zu kodieren wird der fertige Datenstrom mitgeschrieben (`-c copy`).
 * Das kostet praktisch keine Rechenzeit — wichtig, weil die NUC während der
 * Übertragung ohnehin genug zu tun hat.
 */

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

/** Im Docker-Netz heißt der Dienst `mediamtx`; lokal per Variable umbiegbar. */
const QUELLE = process.env.MEDIAMTX_RTMP_URL || 'rtmp://mediamtx:1935/live';

const AKTIV = process.env.RECORD_LIVE !== 'false';

/** Dateiname verrät, zu wem der Mitschnitt gehört — siehe recoverOrphans(). */
const MUSTER = /^live-u(\d+)-(\d+)\.mp4$/;

const laufende = new Map(); // streamKey → { child, filename, fullPath, startedAt }

export function isRecordingEnabled() {
  return AKTIV;
}

export function activeRecordings() {
  return [...laufende.keys()];
}

/** Fasst zusammen, was am Ende auf der Platte liegt — oder null, wenn nichts. */
function ergebnisFuer({ filename, fullPath, startedAt, streamKey }) {
  let bytes = 0;
  try { bytes = fs.statSync(fullPath).size; } catch {}

  if (!bytes) {
    console.warn(`[Aufzeichnung] ${streamKey}: leere Datei, wird verworfen`);
    try { fs.unlinkSync(fullPath); } catch {}
    return null;
  }

  const seconds = Math.round((Date.now() - startedAt) / 1000);
  console.log(`[Aufzeichnung] ${streamKey}: fertig — ${filename}, ${Math.round(bytes / 1024 / 1024)} MB, ${seconds}s`);
  return { filename, fullPath, bytes, seconds };
}

/**
 * @param onClosed  Wird gerufen, wenn die Aufzeichnung von sich aus endet —
 *   bei RTMP heißt das: die sendende Seite ist weg. Ohne diesen Weg bliebe die
 *   Datei liegen, denn der Stopp-Aufruf von MediaMTX kommt danach ins Leere.
 */
export function startRecording({ streamKey, userId, targetDir, onClosed }) {
  if (!AKTIV || !streamKey) return null;
  if (laufende.has(streamKey)) return laufende.get(streamKey).filename;

  const filename = `live-u${userId}-${Date.now()}.mp4`;
  const fullPath = path.join(targetDir, filename);

  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', `${QUELLE}/${streamKey}`,
    '-c', 'copy',
    // Fragmentiertes MP4: bricht der Server mitten in der Übertragung ab,
    // bleibt die Datei trotzdem abspielbar. Ein gewöhnliches MP4 wäre ohne
    // den abschließenden Index unbrauchbar — und genau dann fehlt er.
    '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    '-f', 'mp4',
    fullPath,
  ];

  const child = spawn(FFMPEG, args, { windowsHide: true });
  let fehlerText = '';
  child.stderr.on('data', d => {
    fehlerText += d.toString();
    if (fehlerText.length > 4000) fehlerText = fehlerText.slice(-4000);
  });

  child.on('error', err => {
    console.error(`[Aufzeichnung] ${streamKey}: konnte nicht starten — ${err.message}`);
    laufende.delete(streamKey);
  });

  child.on('close', code => {
    // Beim geplanten Beenden hat stopRecording den Eintrag schon entfernt.
    const eintrag = laufende.get(streamKey);
    if (!eintrag) return;

    laufende.delete(streamKey);
    console.warn(`[Aufzeichnung] ${streamKey}: von selbst beendet (Code ${code}) ${fehlerText.slice(-200)}`);

    // Auch ein abgerissener Stream hat meist schon Material geschrieben — das
    // gehört gesichert, nicht verworfen.
    const ergebnis = ergebnisFuer({ ...eintrag, streamKey });
    if (ergebnis) {
      try { onClosed?.(ergebnis); } catch (err) {
        console.error(`[Aufzeichnung] ${streamKey}: Übernahme nach Abbruch fehlgeschlagen —`, err.message);
      }
    }
  });

  laufende.set(streamKey, { child, filename, fullPath, startedAt: Date.now() });
  console.log(`[Aufzeichnung] ${streamKey} → ${filename}`);
  return filename;
}

/**
 * Sauber beenden: ffmpeg bekommt ein „q" auf die Standardeingabe und schreibt
 * seine Datei zu Ende. Reagiert es nicht, wird nach einer Frist nachgeholfen —
 * dank fragmentiertem MP4 bleibt die Datei auch dann brauchbar.
 */
export function stopRecording(streamKey, { timeoutMs = 15000 } = {}) {
  const eintrag = laufende.get(streamKey);
  if (!eintrag) return Promise.resolve(null);

  laufende.delete(streamKey);
  const { child, filename, fullPath, startedAt } = eintrag;

  return new Promise(resolve => {
    let fertig = false;
    const abschliessen = () => {
      if (fertig) return;
      fertig = true;
      clearTimeout(frist);
      resolve(ergebnisFuer({ filename, fullPath, startedAt, streamKey }));
    };

    child.once('close', abschliessen);

    const frist = setTimeout(() => {
      console.warn(`[Aufzeichnung] ${streamKey}: reagiert nicht, wird beendet`);
      try { child.kill('SIGKILL'); } catch {}
      // Der close-Handler übernimmt; falls auch der ausbleibt, hier abschließen.
      setTimeout(abschliessen, 1000);
    }, timeoutMs);

    try {
      child.stdin.write('q');
      child.stdin.end();
    } catch {
      try { child.kill('SIGTERM'); } catch {}
    }
  });
}

/**
 * Nach einem Neustart liegen gebliebene Mitschnitte einsammeln.
 *
 * Stirbt der Server mitten in einer Übertragung, läuft niemand mehr durch
 * stopRecording — die Datei liegt aber da und ist dank fragmentiertem MP4
 * abspielbar. Wer sie in der Datenbank nicht wiederfindet, bekommt sie hier
 * nachgetragen, statt sie stillschweigend zu verlieren.
 */
export function findOrphanRecordings(videosDir, istBekannt) {
  let dateien = [];
  try { dateien = fs.readdirSync(videosDir); } catch { return []; }

  return dateien
    .map(name => {
      const treffer = MUSTER.exec(name);
      if (!treffer) return null;
      if (istBekannt(name)) return null;

      let bytes = 0;
      try { bytes = fs.statSync(path.join(videosDir, name)).size; } catch { return null; }
      if (!bytes) return null;

      return { filename: name, userId: Number(treffer[1]), startedAt: Number(treffer[2]), bytes };
    })
    .filter(Boolean);
}
