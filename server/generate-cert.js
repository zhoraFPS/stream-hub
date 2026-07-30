import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
    return {
      key: fs.readFileSync(KEY_PATH),
      cert: fs.readFileSync(CERT_PATH),
    };
  }

  console.log('Generating self-signed HTTPS SSL certificate...');

  try {
    // Generate RSA key pair using Node native crypto
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Write self-signed PEM keys
    fs.writeFileSync(KEY_PATH, privateKey);
    fs.writeFileSync(CERT_PATH, publicKey);

    console.log('HTTPS SSL Certificates created in server/certs/');
    return { key: privateKey, cert: publicKey };
  } catch (err) {
    console.error('Cert generation warning:', err);
    return null;
  }
}
