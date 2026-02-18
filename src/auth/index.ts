import fs from 'node:fs';
import type { OAuth2Client } from 'google-auth-library';
import {
  DEFAULT_AUTH_MODE,
  SCOPES,
  TOKEN_PATH,
  resolveAuthMode,
  resolveCredentialsPath,
  type AuthMode,
} from '../config.js';
import { fail, output } from '../lib/io.js';
import type { Options } from '../lib/types.js';
import { createOAuthClient, refreshMcpToken, runBrowserOAuthFlow } from './oauth.js';
import { clearToken, loadSavedToken, saveToken } from './token.js';

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

function isTokenExpiringSoon(expiryDate?: number | null): boolean {
  return !!(expiryDate && expiryDate < Date.now() + EXPIRY_BUFFER_MS);
}

export async function authorize(credentialsPath: string, requestedMode: AuthMode): Promise<OAuth2Client> {
  const token = loadSavedToken();
  const authMode = token?.authMode || requestedMode;

  if (authMode === 'local' && !fs.existsSync(credentialsPath)) {
    fail('Credentials file not found.', { credentialsPath });
  }

  const oauth = createOAuthClient(authMode, credentialsPath, 0);
  if (token) {
    let credentials = token.credentials;
    if (authMode === 'mcp' && isTokenExpiringSoon(credentials.expiry_date)) {
      credentials = await refreshMcpToken(credentials);
      saveToken(authMode, credentials);
    }
    oauth.setCredentials(credentials);
    return oauth;
  }

  fail('No token found. Run `gw auth login` first.', {
    tokenPath: TOKEN_PATH,
    authMode,
    credentialsPath,
  });
}

export function commandAuthStatus() {
  const token = loadSavedToken();
  output({
    ok: true,
    action: 'auth.status',
    authenticated: !!token,
    authMode: token?.authMode || null,
    defaultAuthMode: DEFAULT_AUTH_MODE,
    tokenPath: TOKEN_PATH,
    scopes: SCOPES,
  });
}

export async function commandAuthLogin(options: Options) {
  const authMode = resolveAuthMode(options);
  const credentialsPath = resolveCredentialsPath(options);
  if (authMode === 'local' && !fs.existsSync(credentialsPath)) {
    fail('Credentials file not found.', { credentialsPath });
  }

  const noOpen = options['no-open'] === true;
  const result = await runBrowserOAuthFlow(authMode, credentialsPath, noOpen);
  saveToken(authMode, result.credentials);

  output({
    ok: true,
    action: 'auth.login',
    authMode,
    credentialsPath: authMode === 'local' ? credentialsPath : null,
    tokenPath: TOKEN_PATH,
    browserOpened: result.browserOpened,
    callbackPort: result.callbackPort,
    scopes: SCOPES,
  });
}

export function commandAuthLogout() {
  clearToken();
  output({ ok: true, action: 'auth.logout', tokenPath: TOKEN_PATH });
}
