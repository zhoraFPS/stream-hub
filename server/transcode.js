import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { setTranscodeStatus, setVideoMedia, getUnfinishedTranscodes } from './db.js';

/**
 * Aufbereitung hochgeladener Videos zu HLS.
 *
 * Vorher lieferte der Server die Originaldatei am Stück aus. Ein 90-Minuten-
 * Testspiel in 1080p sind mehrere Gigabyte — auf dem Handy im Mobilfunknetz
 * unbrauchbar, weil der Player weder früh startet noch die Qualität anpassen
 * kann. ffmpeg schneidet die Datei deshalb in Segmente und legt mehrere
 * Bitraten nebeneinander, aus denen der Player selbst wählt.
 *
 * Die Warteschlange läuft bewusst mit einem Vorgang gleichzeitig: Encoding
 * sättigt alle Kerne, parallele Läufe machen alles langsamer statt schneller.
 */

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

/**
 * Intel-Hardware-Encoding über VAAPI. Die NUC reicht /dev/dri bereits in den
 * Container, das ist also nur einen Schalter entfernt — bleibt aber aus,
 * solange es niemand bewusst einschaltet: schlägt VAAPI fehl, ist die Ursache
 * schwer zu sehen, und Software-Encoding funktioniert überall.
 *   TRANSCODE_HWACCEL=vaapi
 */
const HWACCEL = (process.env.TRANSCODE_HWACCEL || '').toLowerCase();

/** Von klein nach groß. Gerendert wird nur, was die Quelle hergibt. */
const LADDER = [
  { height: 360,  bitrate: 800,  maxrate: 900,   bufsize: 1600,  audio: 96  },
  { height: 540,  bitrate: 1400, maxrate: 1600,  bufsize: 2800,  audio: 128 },
  { height: 720,  bitrate: 2800, maxrate: 3100,  bufsize: 5600,  audio: 128 },
  { height: 1080, bitrate: 5000, maxrate: 5500,  bufsize: 10000, audio: 192 },
];

const queue = [];
let running = false;

// ── Hilfsmittel ───────────────────────────────────────────────────────────────

function run(command, args, { timeoutMs = 1000 * 60 * 60 * 6 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${command} überschritt das Zeitlimit`));
    }, timeoutMs);

    child.stdout?.on('data', d => { stderr += d.toString(); });
    child.stderr.on('data', d => {
      stderr += d.toString();
      if (stderr.length > 20000) stderr = stderr.slice(-20000); // nur das Ende ist interessant
    });

    child.on('error', err => { clearTimeout(timer); reject(err); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(stderr);
      else reject(new Error(`${command} endete mit Code ${code}: ${stderr.slice(-600)}`));
    });
  });
}

/**
 * Prüft nicht nur, ob ffmpeg startet, sondern ob es die Bitratenleiter auch
 * bauen kann. `-var_stream_map` kam erst mit ffmpeg 4 — ein älteres Binary im
 * PATH würde eine reine `-version`-Prüfung bestehen und dann mitten im ersten
 * Auftrag scheitern. Genau das kann passieren: manche Python- und Tool-Pakete
 * legen uralte ffmpeg-Builds in den Suchpfad.
 */
export async function isFfmpegAvailable() {
  try {
    const help = await run(FFMPEG, ['-h', 'muxer=hls'], { timeoutMs: 15000 });
    if (!help.includes('var_stream_map')) {
      console.warn('[Transcode] ffmpeg gefunden, kennt aber -var_stream_map nicht (zu alt, ffmpeg 4+ nötig).');
      return false;
    }
    await run(FFPROBE, ['-version'], { timeoutMs: 15000 });
    return true;
  } catch {
    return false;
  }
}

/** Dauer, Höhe und Tonspur der Quelldatei. */
async function probe(filePath) {
  const output = await run(FFPROBE, [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath,
  ], { timeoutMs: 60000 });

  const data = JSON.parse(output.slice(output.indexOf('{')));
  const video = data.streams?.find(s => s.codec_type === 'video');
  const audio = data.streams?.find(s => s.codec_type === 'audio');

  return {
    duration: Math.round(parseFloat(data.format?.duration) || 0),
    width: video?.width || 0,
    height: video?.height || 0,
    hasAudio: !!audio,
  };
}

/** Die Stufen, die kleiner-gleich der Quelle sind — plus immer mindestens eine. */
function ladderFor(sourceHeight) {
  const usable = LADDER.filter(step => step.height <= (sourceHeight || 1080));
  return usable.length ? usable : [LADDER[0]];
}

/**
 * ffmpeg übernimmt den Trennstrich aus dem Ausgabepfad wörtlich in die
 * Master-Playlist. Unter Windows entstand daraus `v0\index.m3u8`, was kein
 * Browser als URL auflösen kann. Vorwärts-Schrägstriche versteht ffmpeg auf
 * beiden Systemen.
 */
const asFfPath = p => p.split(path.sep).join('/');

function buildArgs({ input, outputDir, steps, hasAudio }) {
  const args = ['-hide_banner', '-loglevel', 'error', '-y'];

  if (HWACCEL === 'vaapi') {
    args.push('-hwaccel', 'vaapi', '-hwaccel_output_format', 'vaapi',
              '-vaapi_device', process.env.VAAPI_DEVICE || '/dev/dri/renderD128');
  }

  args.push('-i', input);

  // Jede Stufe bekommt Bild und, falls vorhanden, Ton.
  steps.forEach(() => {
    args.push('-map', '0:v:0');
    if (hasAudio) args.push('-map', '0:a:0');
  });

  steps.forEach((step, i) => {
    if (HWACCEL === 'vaapi') {
      args.push(
        `-filter:v:${i}`, `scale_vaapi=w=-2:h=${step.height}`,
        `-c:v:${i}`, 'h264_vaapi',
        `-b:v:${i}`, `${step.bitrate}k`,
      );
    } else {
      args.push(
        `-filter:v:${i}`, `scale=-2:${step.height}`,
        `-c:v:${i}`, 'libx264',
        `-preset:v:${i}`, process.env.TRANSCODE_PRESET || 'veryfast',
        `-profile:v:${i}`, 'main',
        `-b:v:${i}`, `${step.bitrate}k`,
        `-maxrate:v:${i}`, `${step.maxrate}k`,
        `-bufsize:v:${i}`, `${step.bufsize}k`,
      );
    }
    if (hasAudio) args.push(`-c:a:${i}`, 'aac', `-b:a:${i}`, `${step.audio}k`, `-ac:${i}`, '2');
  });

  // Feste Keyframe-Abstände, sonst kann der Player nicht sauber umschalten.
  args.push('-g', '48', '-keyint_min', '48', '-sc_threshold', '0');

  const streamMap = steps
    .map((_, i) => (hasAudio ? `v:${i},a:${i}` : `v:${i}`))
    .join(' ');

  args.push(
    '-f', 'hls',
    '-hls_time', '4',
    '-hls_playlist_type', 'vod',
    '-hls_flags', 'independent_segments',
    '-hls_segment_type', 'mpegts',
    '-hls_segment_filename', asFfPath(path.join(outputDir, 'v%v', 'seg-%03d.ts')),
    '-master_pl_name', 'master.m3u8',
    '-var_stream_map', streamMap,
    asFfPath(path.join(outputDir, 'v%v', 'index.m3u8')),
  );

  return args;
}

// ── Ein Auftrag ───────────────────────────────────────────────────────────────

async function runJob({ videoId, sourcePath, hlsRoot, thumbnailsDir, publicThumbnailBase, onDone }) {
  setTranscodeStatus(videoId, 'processing');

  const outputDir = path.join(hlsRoot, videoId);
  fs.mkdirSync(outputDir, { recursive: true });

  const media = await probe(sourcePath);
  const steps = ladderFor(media.height);
  steps.forEach((_, i) => fs.mkdirSync(path.join(outputDir, `v${i}`), { recursive: true }));

  console.log(`[Transcode] ${videoId}: ${media.width}x${media.height}, ${media.duration}s → ${steps.map(s => s.height + 'p').join(', ')}`);

  await run(FFMPEG, buildArgs({
    input: sourcePath,
    outputDir,
    steps,
    hasAudio: media.hasAudio,
  }));

  // Standbild aus dem ersten Zehntel — irgendwo mittendrin statt schwarzes Bild am Anfang.
  let thumbnailUrl = null;
  try {
    const at = Math.max(1, Math.floor((media.duration || 10) * 0.1));
    const thumbName = `poster-${videoId}.jpg`;
    await run(FFMPEG, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-ss', String(at), '-i', sourcePath,
      '-frames:v', '1', '-vf', 'scale=-2:720',
      path.join(thumbnailsDir, thumbName),
    ], { timeoutMs: 120000 });
    thumbnailUrl = `${publicThumbnailBase}/${thumbName}`;
  } catch (err) {
    console.warn(`[Transcode] ${videoId}: kein Standbild (${err.message})`);
  }

  setVideoMedia(videoId, {
    hlsPath: `hls/${videoId}/master.m3u8`,
    duration: media.duration || null,
    height: media.height || null,
    thumbnailUrl,
  });
  setTranscodeStatus(videoId, 'ready');

  console.log(`[Transcode] ${videoId}: fertig`);
  onDone?.(videoId, 'ready');
}

async function drain() {
  if (running) return;
  running = true;

  while (queue.length) {
    const job = queue.shift();
    try {
      await runJob(job);
    } catch (err) {
      console.error(`[Transcode] ${job.videoId} fehlgeschlagen:`, err.message);
      // Das Original bleibt liegen und weiter abspielbar — der Player fällt
      // darauf zurück, wenn keine HLS-Fassung existiert.
      setTranscodeStatus(job.videoId, 'failed', err.message.slice(0, 500));
      job.onDone?.(job.videoId, 'failed');
    }
  }

  running = false;
}

// ── Öffentlich ────────────────────────────────────────────────────────────────

export function enqueue(job) {
  setTranscodeStatus(job.videoId, 'pending');
  queue.push(job);
  drain();
  return { position: queue.length, running };
}

export function queueState() {
  return { waiting: queue.length, running };
}

/**
 * Nach einem Neustart weiterarbeiten. Was als 'processing' markiert ist, war
 * mittendrin, als der Prozess endete — das zählt als offen.
 */
export function resumePending(buildJob) {
  const open = getUnfinishedTranscodes();
  if (!open.length) return 0;
  console.log(`[Transcode] ${open.length} offene Aufbereitung(en) werden fortgesetzt`);
  open.forEach(video => {
    const job = buildJob(video);
    if (job) enqueue(job);
  });
  return open.length;
}
