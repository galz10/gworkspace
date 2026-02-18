import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { URL } from 'node:url';
import { google } from 'googleapis';
import open from 'open';
import type { OAuth2Client } from 'google-auth-library';
import { SCOPES } from '../config.js';
import { fail } from '../lib/io.js';

export function createOAuthClient(credentialsPath: string, port: number): OAuth2Client {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const payload = credentials.installed || credentials.web;
  if (!payload?.client_id || !payload?.client_secret) {
    fail('Invalid credentials file. Expected installed/web OAuth client JSON.');
  }

  const redirectUri = port > 0 ? `http://127.0.0.1:${port}/oauth2callback` : 'http://127.0.0.1';
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

export function waitForAuthCode(port: number, authUrl: string): Promise<string> {
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

export async function runBrowserOAuthFlow(
  credentialsPath: string,
  noOpen: boolean,
): Promise<{ credentials: unknown; callbackPort: number; browserOpened: boolean }> {
  const callbackPort = await getAvailablePort();
  const oauth = createOAuthClient(credentialsPath, callbackPort);
  const authUrl = oauth.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  if (!noOpen) {
    await open(authUrl);
  }

  const code = await waitForAuthCode(callbackPort, authUrl);
  const tokenResponse = await oauth.getToken(code);
  oauth.setCredentials(tokenResponse.tokens);

  return {
    credentials: oauth.credentials,
    callbackPort,
    browserOpened: !noOpen,
  };
}
