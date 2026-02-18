import fs from 'node:fs';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { SCOPES, TOKEN_PATH, resolveCredentialsPath } from '../config.js';
import { fail, output } from '../lib/io.js';
import type { Options } from '../lib/types.js';
import { createOAuthClient, runBrowserOAuthFlow } from './oauth.js';
import { clearToken, loadSavedToken, saveToken } from './token.js';

export async function authorize(credentialsPath: string): Promise<OAuth2Client> {
  const token = loadSavedToken();
  if (token) {
    const oauth = fs.existsSync(credentialsPath)
      ? createOAuthClient(credentialsPath, 0)
      : new google.auth.OAuth2();
    oauth.setCredentials(token);
    return oauth;
  }

  if (!fs.existsSync(credentialsPath)) {
    fail('Credentials file not found.', { credentialsPath });
  }

  fail('No token found. Run `gw auth login` first.', {
    tokenPath: TOKEN_PATH,
    credentialsPath,
  });
}

export function commandAuthStatus() {
  const token = loadSavedToken();
  output({
    ok: true,
    action: 'auth.status',
    authenticated: !!token,
    tokenPath: TOKEN_PATH,
    scopes: SCOPES,
  });
}

export async function commandAuthLogin(options: Options) {
  const credentialsPath = resolveCredentialsPath(options);
  if (!fs.existsSync(credentialsPath)) {
    fail('Credentials file not found.', { credentialsPath });
  }

  const noOpen = options['no-open'] === true;
  const result = await runBrowserOAuthFlow(credentialsPath, noOpen);
  saveToken(result.credentials);

  output({
    ok: true,
    action: 'auth.login',
    credentialsPath,
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
