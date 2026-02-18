import fs from 'node:fs';
import { ensureConfigDir, TOKEN_PATH } from '../config.js';

export function loadSavedToken(): Record<string, unknown> | null {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
}

export function saveToken(credentials: unknown) {
  ensureConfigDir();
  fs.writeFileSync(TOKEN_PATH, `${JSON.stringify(credentials, null, 2)}\n`, 'utf8');
}

export function clearToken() {
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
}
