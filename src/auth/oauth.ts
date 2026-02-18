import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { URL } from 'node:url';
import { google } from 'googleapis';
import open from 'open';
import type { Credentials, OAuth2Client } from 'google-auth-library';
import {
  MCP_CLIENT_ID,
  MCP_CLOUD_FUNCTION_URL,
  SCOPES,
  type AuthMode,
} from '../config.js';
import { fail } from '../lib/io.js';

export function createOAuthClient(
  authMode: AuthMode,
  credentialsPath: string,
  port: number,
): OAuth2Client {
  if (authMode === 'mcp') {
    return new google.auth.OAuth2({ clientId: MCP_CLIENT_ID });
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const payload = credentials.installed || credentials.web;
  if (!payload?.client_id || !payload?.client_secret) {
    fail('Invalid credentials file. Expected installed/web OAuth client JSON.');
  }

  const redirectUri =
    port > 0 ? `http://127.0.0.1:${port}/oauth2callback` : 'http://127.0.0.1';
  return new google.auth.OAuth2(payload.client_id, payload.client_secret, redirectUri);
}

export function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Could not allocate callback port.')));
        return;
      }
      const { port } = address;
      server.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
    server.on('error', reject);
  });
}

function waitForLocalAuthCode(port: number, authUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `Authentication timed out after 5 minutes. Open this URL manually: ${authUrl}`,
        ),
      );
    }, 5 * 60 * 1000);

    const server = http.createServer((req, res) => {
      try {
        if (!req.url) throw new Error('Missing callback URL.');
        const parsed = new URL(req.url, `http://127.0.0.1:${port}`);

        if (parsed.pathname !== '/oauth2callback') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }

        const error = parsed.searchParams.get('error');
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end(`OAuth error: ${error}`);
          throw new Error(`OAuth error: ${error}`);
        }

        const code = parsed.searchParams.get('code');
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing code');
          throw new Error('OAuth callback missing code parameter.');
        }

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Authentication successful. You can close this tab.');
        clearTimeout(timeout);
        server.close(() => resolve(code));
      } catch (err) {
        clearTimeout(timeout);
        server.close(() => reject(err));
      }
    });

    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    server.listen(port, '127.0.0.1');
  });
}

function waitForMcpTokenCallback(
  port: number,
  authUrl: string,
  csrfToken: string,
): Promise<Credentials> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `Authentication timed out after 5 minutes. Open this URL manually: ${authUrl}`,
        ),
      );
    }, 5 * 60 * 1000);

    const server = http.createServer((req, res) => {
      try {
        if (!req.url) throw new Error('Missing callback URL.');
        const parsed = new URL(req.url, `http://127.0.0.1:${port}`);

        if (parsed.pathname !== '/oauth2callback') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }

        const state = parsed.searchParams.get('state');
        if (state !== csrfToken) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('State mismatch.');
          throw new Error('OAuth state mismatch. Possible CSRF attack.');
        }

        const error = parsed.searchParams.get('error');
        if (error) {
          const description = parsed.searchParams.get('error_description') || 'No details';
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end(`OAuth error: ${error}`);
          throw new Error(`OAuth error: ${error}. ${description}`);
        }

        const accessToken = parsed.searchParams.get('access_token');
        const refreshToken = parsed.searchParams.get('refresh_token');
        const scope = parsed.searchParams.get('scope') || undefined;
        const tokenType = parsed.searchParams.get('token_type') || undefined;
        const expiryDate = parsed.searchParams.get('expiry_date');

        if (!accessToken || !expiryDate) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing token fields');
          throw new Error('OAuth callback missing token fields.');
        }

        const credentials: Credentials = {
          access_token: accessToken,
          refresh_token: refreshToken || undefined,
          scope,
          token_type: tokenType,
          expiry_date: Number.parseInt(expiryDate, 10),
        };

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Authentication successful. You can close this tab.');
        clearTimeout(timeout);
        server.close(() => resolve(credentials));
      } catch (err) {
        clearTimeout(timeout);
        server.close(() => reject(err));
      }
    });

    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    server.listen(port, '127.0.0.1');
  });
}

async function runLocalBrowserOAuthFlow(
  credentialsPath: string,
  noOpen: boolean,
): Promise<{ credentials: Credentials; callbackPort: number; browserOpened: boolean }> {
  const callbackPort = await getAvailablePort();
  const oauth = createOAuthClient('local', credentialsPath, callbackPort);
  const authUrl = oauth.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  if (!noOpen) {
    await open(authUrl);
  }

  const code = await waitForLocalAuthCode(callbackPort, authUrl);
  const tokenResponse = await oauth.getToken(code);
  oauth.setCredentials(tokenResponse.tokens);

  return {
    credentials: oauth.credentials,
    callbackPort,
    browserOpened: !noOpen,
  };
}

async function runMcpBrowserOAuthFlow(
  noOpen: boolean,
): Promise<{ credentials: Credentials; callbackPort: number; browserOpened: boolean }> {
  const callbackPort = await getAvailablePort();
  const callbackUri = `http://127.0.0.1:${callbackPort}/oauth2callback`;
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const statePayload = {
    uri: callbackUri,
    manual: false,
    csrf: csrfToken,
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');

  const oauth = createOAuthClient('mcp', '', 0);
  const authUrl = oauth.generateAuthUrl({
    redirect_uri: MCP_CLOUD_FUNCTION_URL,
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent',
  });

  if (!noOpen) {
    await open(authUrl);
  }

  const credentials = await waitForMcpTokenCallback(callbackPort, authUrl, csrfToken);
  oauth.setCredentials(credentials);

  return {
    credentials: oauth.credentials,
    callbackPort,
    browserOpened: !noOpen,
  };
}

export async function refreshMcpToken(credentials: Credentials): Promise<Credentials> {
  if (!credentials.refresh_token) {
    throw new Error('No refresh token available.');
  }

  const res = await fetch(`${MCP_CLOUD_FUNCTION_URL}/refreshToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: credentials.refresh_token }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  const refreshed = (await res.json()) as Record<string, unknown>;
  return {
    ...credentials,
    ...(refreshed as Credentials),
    refresh_token: credentials.refresh_token,
  };
}

export async function runBrowserOAuthFlow(
  authMode: AuthMode,
  credentialsPath: string,
  noOpen: boolean,
): Promise<{ credentials: Credentials; callbackPort: number; browserOpened: boolean }> {
  if (authMode === 'mcp') return runMcpBrowserOAuthFlow(noOpen);
  return runLocalBrowserOAuthFlow(credentialsPath, noOpen);
}
