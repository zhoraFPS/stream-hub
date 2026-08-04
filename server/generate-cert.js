import fs from 'fs';
import os from 'os';
import path from 'path';
import selfsigned from 'selfsigned';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CERTS_DIR = path.join(__dirname, 'certs');
const KEY_PATH = path.join(CERTS_DIR, 'server.key');
const CERT_PATH = path.join(CERTS_DIR, 'server.crt');
/** Merkt sich, für welche Adressen das vorhandene Zertifikat ausgestellt wurde. */
const NAMES_PATH = path.join(CERTS_DIR, 'server.names');

/**
 * Selbstsigniertes Zertifikat für den Betrieb im Vereinsnetz.
 *
 * Vorher stand hier eine fest eingetragene Adresse (10.12.103.170) als
 * CommonName — und sonst nichts. Zwei Probleme:
 *
 *  1. Chrome wertet CommonName seit Version 58 gar nicht mehr aus. Ohne
 *     subjectAltName ist ein Zertifikat für jeden modernen Browser ungültig,
 *     egal welche Adresse draufsteht.
 *  2. Die Adresse war fest verdrahtet. Bekommt die NUC per DHCP eine andere,
 *     passt das Zertifikat zu gar nichts mehr.
 *
 * Jetzt werden alle lokalen Adressen ermittelt und als SAN eingetragen.
 * Ändern sie sich, wird neu ausgestellt.
 *
 * Wichtig bleibt: selbstsigniert heißt nicht vertrauenswürdig. Für einen
 * echten sicheren Kontext — den etwa Google Cast erwartet — muss das
 * Zertifikat auf den Geräten als vertrauenswürdig hinterlegt werden.
 * Zum Anschauen genügt das Durchklicken der Warnung.
 */
function collectHostNames() {
  const dns = new Set(['localhost']);
  const ips = new Set(['127.0.0.1', '::1']);

  const hostname = os.hostname();
  if (hostname) {
    dns.add(hostname);
    // Windows meldet den Namen gern in Großschreibung; Zertifikatsabgleich
    // ist zwar unabhängig davon, doppelte Einträge schaden aber nicht.
    dns.add(hostname.toLowerCase());
  }

  for (const eintraege of Object.values(os.networkInterfaces())) {
    for (const adresse of eintraege || []) {
      if (adresse.internal) continue;
      if (adresse.family === 'IPv4' || adresse.family === 4) ips.add(adresse.address);
    }
  }

  // Zusätzliche Namen für den Zugriff von außen, etwa ein DNS-Eintrag im
  // Vereinsnetz: SSL_EXTRA_NAMES=tv.vfl.local,192.168.1.50
  for (const roh of (process.env.SSL_EXTRA_NAMES || '').split(',')) {
    const wert = roh.trim();
    if (!wert) continue;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(wert)) ips.add(wert);
    else dns.add(wert);
  }

  return { dns: [...dns], ips: [...ips] };
}

function namesFingerprint({ dns, ips }) {
  return [...dns].sort().concat([...ips].sort()).join('|');
}

export function ensureCertsExist() {
  if (!fs.existsSync(CERTS_DIR)) fs.mkdirSync(CERTS_DIR, { recursive: true });

  const namen = collectHostNames();
  const fingerprint = namesFingerprint(namen);

  // Vorhandenes Zertifikat weiterverwenden — aber nur, wenn es noch zu den
  // aktuellen Adressen passt. Nach einem DHCP-Wechsel tut es das nicht mehr.
  if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
    try {
      const key = fs.readFileSync(KEY_PATH);
      const cert = fs.readFileSync(CERT_PATH);
      const gespeichert = fs.existsSync(NAMES_PATH)
        ? fs.readFileSync(NAMES_PATH, 'utf8').trim()
        : '';

      if (key.length > 50 && cert.length > 50 && gespeichert === fingerprint) {
        return { key, cert };
      }
      if (gespeichert && gespeichert !== fingerprint) {
        console.log('[TLS] Netzwerkadressen haben sich geändert — Zertifikat wird neu ausgestellt.');
      }
    } catch {}
  }

  try {
    // Nur ASCII im Subject: node-forge kodiert diese Werte als PrintableString.
    // Ein Zeichen außerhalb davon — ein Gedankenstrich genügt — erzeugt
    // fehlerhaftes DER, und das Zertifikat lässt sich anschließend nicht mehr
    // einlesen. Der Fehler fällt erst beim Verbindungsaufbau auf.
    const nurAscii = (wert) => String(wert).replace(/[^\x20-\x7E]/g, '');

    const attrs = [
      { name: 'commonName', value: nurAscii(namen.dns[0] || 'localhost') },
      { name: 'organizationName', value: nurAscii('VfL Bochum 1848 - 1848TV') },
    ];

    const pems = selfsigned.generate(attrs, {
      days: 3650,
      keySize: 2048,
      algorithm: 'sha256',
      extensions: [
        { name: 'basicConstraints', cA: false },
        {
          name: 'keyUsage',
          digitalSignature: true,
          keyEncipherment: true,
        },
        { name: 'extKeyUsage', serverAuth: true },
        {
          name: 'subjectAltName',
          altNames: [
            // type 2 = DNS, type 7 = IP — so verlangt es node-forge.
            ...namen.dns.map(value => ({ type: 2, value })),
            ...namen.ips
              .filter(value => !value.includes(':')) // node-forge kann kein IPv6
              .map(value => ({ type: 7, ip: value })),
          ],
        },
      ],
    });

    fs.writeFileSync(KEY_PATH, pems.private);
    fs.writeFileSync(CERT_PATH, pems.cert);
    fs.writeFileSync(NAMES_PATH, fingerprint);

    console.log(`[TLS] Zertifikat ausgestellt für: ${namen.dns.join(', ')}, ${namen.ips.filter(i => !i.includes(':')).join(', ')}`);
    return { key: pems.private, cert: pems.cert };
  } catch (err) {
    console.error('[TLS] Zertifikat konnte nicht erzeugt werden:', err.message);
    return null;
  }
}
