import { CREDENTIALS_PATH, TOKEN_PATH } from './config.js';

type Domain = {
  summary: string;
  commands: string[];
};

const HELP: Record<string, Domain> = {
  auth: {
    summary: 'Authenticate gw with Google Workspace',
    commands: [
      'gw auth login [--credentials path/to/credentials.json] [--no-open]',
      'gw auth status',
      'gw auth logout',
    ],
  },
  calendar: {
    summary: 'Read calendar events',
    commands: [
      'gw calendar list --from <ISO> --to <ISO> [--calendarId primary] [--max 20]',
      'gw calendar list today [--calendarId primary] [--max 20]',
      'gw calendar_getEvents --timeMin <ISO> --timeMax <ISO> [--calendarId primary]',
    ],
  },
  gmail: {
    summary: 'Search and read Gmail messages',
    commands: [
      'gw gmail search --query "newer_than:7d" [--max 20]',
      'gw gmail list today [--max 20]',
      'gw gmail get --id <messageId>',
      'gw gmail_search --query "..." --max 20',
    ],
  },
  drive: {
    summary: 'Search and inspect Drive files',
    commands: [
      'gw drive search --query "trashed = false" [--max 20]',
      'gw drive recent [--max 20]',
      'gw drive get --id <fileId>',
      'gw drive_search --query "..." --max 20',
    ],
  },
  chat: {
    summary: 'Read Google Chat spaces and messages',
    commands: [
      'gw chat spaces [--max 20] [--filter "spaceType = SPACE"]',
      'gw chat messages --space spaces/<spaceId> [--max 20]',
      'gw chat list today --space spaces/<spaceId> [--max 20]',
    ],
  },
  time: {
    summary: 'Print local time context',
    commands: ['gw time now', 'gw time date', 'gw time zone'],
  },
};

function printText(text: string): never {
  process.stdout.write(`${text}\n`);
  process.exit(0);
}

export function usage(topic?: string): never {
  const normalized = topic?.trim().toLowerCase();
  const selected = normalized ? HELP[normalized] : undefined;
  if (selected) {
    const topicName = normalized as string;
    const commands = selected.commands.map((line) => `  ${line}`).join('\n');
    printText(
      [
        `${topicName.toUpperCase()} COMMANDS`,
        commands,
        '',
        'LEARN MORE',
        `  Use \`gw ${topicName} --help\` for command usage.`,
      ].join('\n'),
    );
  }

  const core = Object.entries(HELP)
    .map(([name, def]) => `  ${name.padEnd(14)}${def.summary}`)
    .join('\n');

  printText(
    [
      'Work seamlessly with Google Workspace from the command line.',
      '',
      'USAGE',
      '  gw <command> <subcommand> [flags]',
      '',
      'CORE COMMANDS',
      core,
      '',
      'FLAGS',
      '  --help    Show help for command',
      '',
      'CONFIG FILES',
      `  credentials: ${CREDENTIALS_PATH}`,
      `  token:       ${TOKEN_PATH}`,
      '',
      'LEARN MORE',
      '  Use `gw <command> --help` for more information about a command.',
    ].join('\n'),
  );
}
