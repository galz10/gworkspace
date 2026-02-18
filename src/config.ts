import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Options } from './lib/types.js';
import { optString } from './lib/args.js';

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.messages.readonly',
];

export const CONFIG_DIR =
  process.env.GWORKSPACE_CONFIG_DIR ||
  path.join(os.homedir(), '.config', 'gworkspace');

export const TOKEN_PATH = path.join(CONFIG_DIR, 'token.json');

export const CREDENTIALS_PATH =
  process.env.GOOGLE_OAUTH_CREDENTIALS ||
  path.join(CONFIG_DIR, 'credentials.json');

export function ensureConfigDir() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

export function resolveCredentialsPath(options: Options): string {
  const fromOption = optString(options, 'credentials');
  return fromOption ? path.resolve(fromOption) : CREDENTIALS_PATH;
}
