import { allows } from './consent';

/**
 * Google Cast (Chromecast).
 *
 * Das SDK liegt auf gstatic.com. Es wird deshalb **erst nach ausdrücklicher
 * Zustimmung** geladen — vorher erfährt Google nicht einmal, dass jemand die
 * Seite geöffnet hat. Ohne Zustimmung bleibt der Knopf schlicht aus.
 *
 * AirPlay braucht davon nichts: das steckt in Safari selbst und wird direkt am
 * Video-Element angeboten.
 */

const SDK_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
const DEFAULT_RECEIVER = 'CC1AD845'; // Standard-Empfänger von Google, kann HLS

let ladeVorgang = null;

/**
 * Lädt das SDK genau einmal. Gibt false zurück, wenn keine Zustimmung vorliegt
 * oder der Browser gar kein Cast kann.
 */
export function loadCastSdk() {
  if (!allows('external')) return Promise.resolve(false);
  if (ladeVorgang) return ladeVorgang;

  ladeVorgang = new Promise((resolve) => {
    if (window.cast?.framework) return resolve(true);

    // Das SDK ruft diesen Haken auf, sobald es bereit ist.
    window.__onGCastApiAvailable = (verfuegbar) => {
      if (!verfuegbar) return resolve(false);
      try {
        window.cast.framework.CastContext.getInstance().setOptions({
          receiverApplicationId: DEFAULT_RECEIVER,
          autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
        });
        resolve(true);
      } catch {
        resolve(false);
      }
    };

    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => resolve(false);
    document.head.appendChild(script);

    // Kein Chromecast im Netz, Erweiterung blockiert, kein Internet — dann
    // meldet sich der Haken nie. Nach einer Weile aufgeben statt hängen.
    setTimeout(() => resolve(!!window.cast?.framework), 8000);
  });

  return ladeVorgang;
}

/** Steht gerade ein Gerät zur Verfügung? */
export function castState() {
  const kontext = window.cast?.framework?.CastContext?.getInstance?.();
  if (!kontext) return 'nicht-geladen';
  return kontext.getCastState(); // NO_DEVICES_AVAILABLE | NOT_CONNECTED | CONNECTING | CONNECTED
}

/**
 * Video an den Chromecast schicken.
 *
 * Die Adresse muss für das Gerät erreichbar sein — es holt sich den Stream
 * selbst. Im Vereinsnetz heißt das: die IP der NUC, nicht `localhost`.
 */
export async function castMedia({ url, title, poster, contentType }) {
  const bereit = await loadCastSdk();
  if (!bereit) throw new Error('Google Cast steht nicht zur Verfügung.');

  const kontext = window.cast.framework.CastContext.getInstance();
  await kontext.requestSession();

  const sitzung = kontext.getCurrentSession();
  if (!sitzung) throw new Error('Keine Verbindung zum Gerät.');

  const info = new window.chrome.cast.media.MediaInfo(
    url,
    contentType || (url.includes('.m3u8') ? 'application/x-mpegurl' : 'video/mp4')
  );
  info.metadata = new window.chrome.cast.media.GenericMediaMetadata();
  info.metadata.title = title || '1848TV';
  if (poster) info.metadata.images = [new window.chrome.cast.Image(poster)];
  // Live-Übertragungen dürfen nicht als Datei behandelt werden, sonst zeigt
  // der Empfänger einen Fortschrittsbalken, der nichts bedeutet.
  info.streamType = window.chrome.cast.media.StreamType.BUFFERED;

  const anfrage = new window.chrome.cast.media.LoadRequest(info);
  await sitzung.loadMedia(anfrage);
  return true;
}

/** Verbindung trennen, ohne die Wiedergabe auf dem Gerät zu stoppen. */
export function stopCasting() {
  try {
    window.cast?.framework?.CastContext?.getInstance()?.endCurrentSession(true);
  } catch {}
}
