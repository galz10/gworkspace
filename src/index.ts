#!/usr/bin/env node

import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';
import { google } from 'googleapis';
import open from 'open';

type Primitive = string | boolean;
type OptValue = Primitive | Primitive[];
type Options = Record<string, OptValue>;
type JsonObject = Record<string, unknown>;
type AnyRecord = Record<string, any>;

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
];

const CONFIG_DIR =
  process.env.GWORKSPACE_CONFIG_DIR ||
  path.join(os.homedir(), '.config', 'gworkspace');
const TOKEN_PATH = path.join(CONFIG_DIR, 'token.json');
const CREDENTIALS_PATH =
  process.env.GOOGLE_OAUTH_CREDENTIALS ||
  path.join(CONFIG_DIR, 'credentials.json');

function output(payload: JsonObject, code = 0): never {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(code);
}

function fail(message: string, details?: unknown): never {
  output(
    {
      ok: false,
      error: message,
      details: details ?? null,
    },
    1,
  );
}

function ensureConfigDir() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const options: Options = {};

  const setOpt = (key: string, value: Primitive) => {
    const current = options[key];
    if (current === undefined) {
      options[key] = value;
      return;
    }
    if (Array.isArray(current)) {
      options[key] = [...current, value];
      return;
    }
    options[key] = [current, value];
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }

    const eq = token.indexOf('=');
    if (eq > 2) {
      setOpt(token.slice(2, eq), token.slice(eq + 1));
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      setOpt(key, true);
      continue;
    }

    setOpt(key, next);
    i += 1;
  }

  return { positional, options };
}

function optString(options: Options, key: string): string | undefined {
  const value = options[key];
  if (value === undefined || typeof value === 'boolean') return undefined;
  if (Array.isArray(value)) return String(value[value.length - 1]);
  return String(value);
}

function optNumber(options: Options, key: string, fallback: number): number {
  const raw = optString(options, key);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

function resolveCredentialsPath(options: Options): string {
  const fromOption = optString(options, 'credentials');
  return fromOption ? path.resolve(fromOption) : CREDENTIALS_PATH;
}

function loadSavedToken(): Record<string, unknown> | null {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
}

function saveToken(credentials: unknown) {
  ensureConfigDir();
  fs.writeFileSync(TOKEN_PATH, `${JSON.stringify(credentials, null, 2)}\n`, 'utf8');
}

async function authorize(credentialsPath: string) {
  const oauth = createOAuthClient(credentialsPath, 0);
  const token = loadSavedToken();
  if (token) {
    oauth.setCredentials(token);
    return oauth;
  }
  fail('No token found. Run `gworkspace auth login` first.', {
    tokenPath: TOKEN_PATH,
    credentialsPath,
  });
}

function usage(): never {
  output({
    ok: true,
    name: 'gworkspace',
    description: 'Native Google Workspace CLI (no MCP protocol)',
    commands: [
      'gworkspace auth login [--credentials path/to/credentials.json] [--no-open]',
      'gworkspace auth status',
      'gworkspace auth logout',
      'gworkspace calendar list --from <ISO> --to <ISO> [--calendarId primary] [--max 20]',
      'gworkspace gmail search --query "newer_than:7d" [--max 20]',
      'gworkspace gmail get --id <messageId>',
      'gworkspace drive search --query "trashed = false" [--max 20]',
      'gworkspace drive recent [--max 20]',
      'gworkspace drive get --id <fileId>',
      'gworkspace time now',
      'gworkspace time date',
      'gworkspace time zone',
      'gworkspace calendar_getEvents --timeMin <ISO> --timeMax <ISO> [--calendarId primary]',
      'gworkspace gmail_search --query "..." --max 20',
      'gworkspace drive_search --query "..." --max 20',
    ],
    config: {
      credentialsPath: CREDENTIALS_PATH,
      tokenPath: TOKEN_PATH,
    },
  });
}

function commandAuthStatus() {
  const token = loadSavedToken();
  output({
    ok: true,
    action: 'auth.status',
    authenticated: !!token,
    tokenPath: TOKEN_PATH,
    scopes: SCOPES,
  });
}

async function commandAuthLogin(options: Options) {
  const credentialsPath = resolveCredentialsPath(options);
  if (!fs.existsSync(credentialsPath)) {
    fail('Credentials file not found.', { credentialsPath });
  }

  const noOpen = options['no-open'] === true;
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
  saveToken(oauth.credentials);

  output({
    ok: true,
    action: 'auth.login',
    credentialsPath,
    tokenPath: TOKEN_PATH,
    browserOpened: !noOpen,
    callbackPort,
    scopes: SCOPES,
  });
}

function commandAuthLogout() {
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  output({ ok: true, action: 'auth.logout', tokenPath: TOKEN_PATH });
}

async function commandCalendarList(auth: any, options: Options) {
  const calendar = google.calendar({ version: 'v3', auth });
  const now = new Date();
  const from = optString(options, 'from') || now.toISOString();
  const to =
    optString(options, 'to') ||
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const max = Math.max(1, Math.min(optNumber(options, 'max', 20), 250));

  const res = await calendar.events.list({
    calendarId: optString(options, 'calendarId') || 'primary',
    timeMin: from,
    timeMax: to,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: max,
  });

  const items = res.data.items || [];
  output({
    ok: true,
    action: 'calendar.list',
    from,
    to,
    count: items.length,
    events: items.map((item: AnyRecord) => ({
      id: item.id,
      status: item.status,
      summary: item.summary,
      description: item.description,
      start: item.start,
      end: item.end,
      htmlLink: item.htmlLink,
    })),
  });
}

async function commandGmailSearch(auth: any, options: Options) {
  const gmail = google.gmail({ version: 'v1', auth });
  const max = Math.max(1, Math.min(optNumber(options, 'max', 20), 100));

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: optString(options, 'query') || '',
    maxResults: max,
    pageToken: optString(options, 'pageToken'),
  });

  const messages = res.data.messages || [];
  output({
    ok: true,
    action: 'gmail.search',
    query: optString(options, 'query') || '',
    count: messages.length,
    nextPageToken: res.data.nextPageToken || null,
    messages: messages.map((m: AnyRecord) => ({ id: m.id, threadId: m.threadId })),
  });
}

async function commandGmailGet(auth: any, options: Options) {
  const id = optString(options, 'id');
  if (!id) fail('Missing required --id for gmail get.');

  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.messages.get({
    userId: 'me',
    id,
    format: 'metadata',
    metadataHeaders: ['From', 'To', 'Subject', 'Date'],
  });

  const headers = res.data.payload?.headers || [];
  const map = headers.reduce<Record<string, string>>((acc, h: AnyRecord) => {
    if (h.name && h.value) acc[h.name.toLowerCase()] = h.value;
    return acc;
  }, {});

  output({
    ok: true,
    action: 'gmail.get',
    message: {
      id: res.data.id,
      threadId: res.data.threadId,
      labelIds: res.data.labelIds || [],
      snippet: res.data.snippet || '',
      subject: map.subject || '',
      from: map.from || '',
      to: map.to || '',
      date: map.date || '',
      internalDate: res.data.internalDate || null,
    },
  });
}

async function commandDriveSearch(auth: any, options: Options) {
  const drive = google.drive({ version: 'v3', auth });
  const max = Math.max(1, Math.min(optNumber(options, 'max', 20), 200));

  const res = await drive.files.list({
    q: optString(options, 'query') || 'trashed = false',
    pageSize: max,
    fields: 'files(id,name,mimeType,modifiedTime,owners,webViewLink),nextPageToken',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  const files = res.data.files || [];
  output({
    ok: true,
    action: 'drive.search',
    count: files.length,
    nextPageToken: res.data.nextPageToken || null,
    files,
  });
}

async function commandDriveRecent(auth: any, options: Options) {
  const drive = google.drive({ version: 'v3', auth });
  const max = Math.max(1, Math.min(optNumber(options, 'max', 20), 200));

  const res = await drive.files.list({
    q: 'trashed = false',
    orderBy: 'modifiedTime desc',
    pageSize: max,
    fields: 'files(id,name,mimeType,modifiedTime,owners,webViewLink),nextPageToken',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  output({
    ok: true,
    action: 'drive.recent',
    count: (res.data.files || []).length,
    files: res.data.files || [],
  });
}

async function commandDriveGet(auth: any, options: Options) {
  const id = optString(options, 'id');
  if (!id) fail('Missing required --id for drive get.');

  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.get({
    fileId: id,
    fields: 'id,name,mimeType,modifiedTime,owners,webViewLink,size',
    supportsAllDrives: true,
  });

  output({ ok: true, action: 'drive.get', file: res.data });
}

function commandTimeNow() {
  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  output({
    ok: true,
    action: 'time.now',
    utc: now.toISOString(),
    localDate: now.toLocaleDateString('en-CA', { timeZone }),
    localTime: now.toLocaleTimeString('en-GB', { hour12: false, timeZone }),
    timeZone,
  });
}

function commandTimeDate() {
  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  output({
    ok: true,
    action: 'time.date',
    utc: now.toISOString().slice(0, 10),
    local: now.toLocaleDateString('en-CA', { timeZone }),
    timeZone,
  });
}

function commandTimeZone() {
  output({
    ok: true,
    action: 'time.zone',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [domain, command] = positional;

  if (!domain || options.help || options.h) usage();

  if (domain === 'auth' && command === 'status') commandAuthStatus();
  if (domain === 'auth' && command === 'login') await commandAuthLogin(options);
  if (domain === 'auth' && command === 'logout') commandAuthLogout();

  if (domain === 'time' && command === 'now') commandTimeNow();
  if (domain === 'time' && command === 'date') commandTimeDate();
  if (domain === 'time' && command === 'zone') commandTimeZone();

  const alias = domain;
  if (alias === 'calendar_getEvents') {
    const auth = await authorize(resolveCredentialsPath(options));
    const patched: Options = {
      ...options,
      from: optString(options, 'timeMin') || optString(options, 'from') || true,
      to: optString(options, 'timeMax') || optString(options, 'to') || true,
      max: optString(options, 'maxResults') || optString(options, 'max') || true,
    };
    await commandCalendarList(auth, patched);
  }

  if (alias === 'gmail_search') {
    const auth = await authorize(resolveCredentialsPath(options));
    await commandGmailSearch(auth, options);
  }

  if (alias === 'drive_search') {
    const auth = await authorize(resolveCredentialsPath(options));
    await commandDriveSearch(auth, options);
  }

  if (domain === 'calendar' && command === 'list') {
    const auth = await authorize(resolveCredentialsPath(options));
    await commandCalendarList(auth, options);
  }

  if (domain === 'gmail' && command === 'search') {
    const auth = await authorize(resolveCredentialsPath(options));
    await commandGmailSearch(auth, options);
  }

  if (domain === 'gmail' && command === 'get') {
    const auth = await authorize(resolveCredentialsPath(options));
    await commandGmailGet(auth, options);
  }

  if (domain === 'drive' && command === 'search') {
    const auth = await authorize(resolveCredentialsPath(options));
    await commandDriveSearch(auth, options);
  }

  if (domain === 'drive' && command === 'recent') {
    const auth = await authorize(resolveCredentialsPath(options));
    await commandDriveRecent(auth, options);
  }

  if (domain === 'drive' && command === 'get') {
    const auth = await authorize(resolveCredentialsPath(options));
    await commandDriveGet(auth, options);
  }

  fail(`Unknown command: ${[domain, command].filter(Boolean).join(' ')}`);
}

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  fail('Command failed.', msg);
});

function getAvailablePort(): Promise<number> {
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

function createOAuthClient(credentialsPath: string, port: number) {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const payload = credentials.installed || credentials.web;
  if (!payload?.client_id || !payload?.client_secret) {
    fail('Invalid credentials file. Expected installed/web OAuth client JSON.');
  }
  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
  return new google.auth.OAuth2(
    payload.client_id,
    payload.client_secret,
    redirectUri,
  );
}

function waitForAuthCode(port: number, authUrl: string): Promise<string> {
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
