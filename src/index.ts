#!/usr/bin/env bun

type Json = Record<string, unknown>;

function out(payload: Json, code = 0): never {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(code);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const options: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
    } else {
      options[key] = next;
      i += 1;
    }
  }
  return { positional, options };
}

const READONLY_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
];

function usage() {
  out({
    ok: true,
    name: 'gworkspace',
    description: 'Read-only Google Workspace context CLI (scaffold)',
    commands: [
      'gworkspace auth status',
      'gworkspace calendar list --from <ISO> --to <ISO> --max 20',
      'gworkspace gmail search --query "newer_than:7d" --max 20',
      'gworkspace drive recent --max 20',
    ],
    note: 'This is a Bun TypeScript scaffold ready for auth + API wiring.',
  });
}

function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const area = positional[0];
  const action = positional[1];

  if (!area || options.help || options.h) {
    usage();
    return;
  }

  if (area === 'auth' && action === 'status') {
    out({
      ok: true,
      action: 'auth.status',
      authenticated: false,
      scopes: READONLY_SCOPES,
      next: 'Implement OAuth flow and token persistence.',
    });
  }

  if (area === 'calendar' && action === 'list') {
    out({
      ok: true,
      action: 'calendar.list',
      from: options.from || null,
      to: options.to || null,
      max: Number(options.max || 20),
      events: [],
      stub: true,
    });
  }

  if (area === 'gmail' && action === 'search') {
    out({
      ok: true,
      action: 'gmail.search',
      query: options.query || '',
      max: Number(options.max || 20),
      messages: [],
      stub: true,
    });
  }

  if (area === 'drive' && action === 'recent') {
    out({
      ok: true,
      action: 'drive.recent',
      max: Number(options.max || 20),
      files: [],
      stub: true,
    });
  }

  out({ ok: false, error: `Unknown command: ${[area, action].filter(Boolean).join(' ')}` }, 1);
}

main();
