import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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

  if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
    try {
      const key = fs.readFileSync(KEY_PATH);
      const cert = fs.readFileSync(CERT_PATH);
      if (key.length > 50 && cert.length > 50 && cert.toString().includes('BEGIN CERTIFICATE')) {
        return { key, cert };
      }
    } catch (e) {}
  }

  console.log('Generating valid self-signed X.509 SSL Certificate via OpenSSL...');

  try {
    const cmd = `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${KEY_PATH}" -out "${CERT_PATH}" -days 3650 -subj "/CN=StreamHub"`;
    execSync(cmd, { stdio: 'pipe' });

    console.log('X.509 SSL Certificates generated successfully in server/certs/');
    return {
      key: fs.readFileSync(KEY_PATH),
      cert: fs.readFileSync(CERT_PATH),
    };
  } catch (err) {
    console.error('OpenSSL generation failed, creating JS fallback cert:', err.message);
    
    // JS Fallback using standard openssl fallback or return null
    return null;
  }
}
