import fs from 'node:fs';
import type { Credentials } from 'google-auth-library';
import type { AuthMode } from '../config.js';
import { ensureConfigDir, TOKEN_PATH } from '../config.js';

export type SavedToken = {
  authMode: AuthMode;
  credentials: Credentials;
};

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
    const authMode = raw.authMode === 'local' ? 'local' : 'mcp';
    return {
      authMode,
      credentials: raw.credentials as Credentials,
    };
  }

  // Backward compatibility with legacy token-only shape.
  return {
    authMode: 'local',
    credentials: raw as Credentials,
  };
}

export function saveToken(authMode: AuthMode, credentials: Credentials) {
  ensureConfigDir();
  const payload: SavedToken = { authMode, credentials };
  fs.writeFileSync(TOKEN_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function clearToken() {
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
}
