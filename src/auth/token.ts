import fs from 'node:fs';
import type { Credentials } from 'google-auth-library';
import { ensureConfigDir, TOKEN_PATH } from '../config.js';

export type SavedToken = Credentials;

export function loadSavedToken(): SavedToken | null {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  const raw = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')) as Record<string, unknown>;
  if (
    raw &&
    typeof raw === 'object' &&
    'credentials' in raw &&
    raw.credentials &&
    typeof raw.credentials === 'object'
  ) {
    return raw.credentials as Credentials;
  }

  return raw as Credentials;
}

export function saveToken(credentials: Credentials) {
  ensureConfigDir();
  fs.writeFileSync(TOKEN_PATH, `${JSON.stringify(credentials, null, 2)}\n`, 'utf8');
}

export function clearToken() {
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
}
