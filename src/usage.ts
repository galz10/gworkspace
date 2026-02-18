import { CREDENTIALS_PATH, DEFAULT_AUTH_MODE, TOKEN_PATH } from './config.js';
import { output } from './lib/io.js';

const HELP: Record<string, string[]> = {
  auth: [
    'gw auth login [--auth-mode mcp|local] [--credentials path/to/credentials.json] [--no-open]',
    'gw auth status',
    'gw auth logout',
  ],
  calendar: [
    'gw calendar list --from <ISO> --to <ISO> [--calendarId primary] [--max 20]',
    'gw calendar_getEvents --timeMin <ISO> --timeMax <ISO> [--calendarId primary]',
  ],
  gmail: [
    'gw gmail search --query "newer_than:7d" [--max 20]',
    'gw gmail get --id <messageId>',
    'gw gmail_search --query "..." --max 20',
  ],
  drive: [
    'gw drive search --query "trashed = false" [--max 20]',
    'gw drive recent [--max 20]',
    'gw drive get --id <fileId>',
    'gw drive_search --query "..." --max 20',
  ],
  chat: [
    'gw chat spaces [--max 20] [--filter "spaceType = SPACE"]',
    'gw chat messages --space spaces/<spaceId> [--max 20]',
  ],
  time: ['gw time now', 'gw time date', 'gw time zone'],
};

const ALL_COMMANDS = Object.values(HELP).flat();

export function usage(topic?: string): never {
  const normalized = topic?.trim().toLowerCase();
  const commands =
    normalized && HELP[normalized]
      ? HELP[normalized]
      : normalized
        ? ALL_COMMANDS
        : ALL_COMMANDS;

  output({
    ok: true,
    name: 'gw',
    description: 'Native Google Workspace CLI (no MCP protocol)',
    usage: 'gw <domain> <command> [options]',
    help: [
      'gw --help',
      'gw -h',
      'gw help',
      'gw <domain> --help',
      'gw help <domain>',
    ],
    topic: normalized && HELP[normalized] ? normalized : 'all',
    commands,
    domains: Object.keys(HELP),
    config: {
      defaultAuthMode: DEFAULT_AUTH_MODE,
      credentialsPath: CREDENTIALS_PATH,
      tokenPath: TOKEN_PATH,
    },
  });
}
