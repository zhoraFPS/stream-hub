import fs from 'fs';
import path from 'path';
import selfsigned from 'selfsigned';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CERTS_DIR = path.join(__dirname, 'certs');
const KEY_PATH = path.join(CERTS_DIR, 'server.key');
const CERT_PATH = path.join(CERTS_DIR, 'server.crt');

export function ensureCertsExist() {
  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
  }

  // Load existing valid certs
  if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
    try {
      const key = fs.readFileSync(KEY_PATH);
      const cert = fs.readFileSync(CERT_PATH);
      if (key.length > 50 && cert.length > 50) {
        return { key, cert };
      }
    } catch (e) {}
  }

  console.log('Generating valid self-signed X.509 SSL Certificate via selfsigned...');

  try {
    const attrs = [
      { name: 'commonName', value: '10.12.103.170' },
      { name: 'organizationName', value: 'StreamHub' }
    ];

    const pems = selfsigned.generate(attrs, {
      days: 3650,
      keySize: 2048,
      algorithm: 'sha256'
    });

    fs.writeFileSync(KEY_PATH, pems.private);
    fs.writeFileSync(CERT_PATH, pems.cert);

    console.log('✅ X.509 SSL Certificates generated successfully in server/certs/');
    return {
      key: pems.private,
      cert: pems.cert,
    };
  } catch (err) {
    console.error('Selfsigned cert generation error:', err);
    return null;
  }
}
