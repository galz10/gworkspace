import { CREDENTIALS_PATH, TOKEN_PATH } from './config.js';
import { output } from './lib/io.js';

export function usage(): never {
  output({
    ok: true,
    name: 'gw',
    description: 'Native Google Workspace CLI (no MCP protocol)',
    commands: [
      'gw auth login [--credentials path/to/credentials.json] [--no-open]',
      'gw auth status',
      'gw auth logout',
      'gw calendar list --from <ISO> --to <ISO> [--calendarId primary] [--max 20]',
      'gw gmail search --query "newer_than:7d" [--max 20]',
      'gw gmail get --id <messageId>',
      'gw drive search --query "trashed = false" [--max 20]',
      'gw drive recent [--max 20]',
      'gw drive get --id <fileId>',
      'gw chat spaces [--max 20] [--filter "spaceType = SPACE"]',
      'gw chat messages --space spaces/<spaceId> [--max 20]',
      'gw time now',
      'gw time date',
      'gw time zone',
      'gw calendar_getEvents --timeMin <ISO> --timeMax <ISO> [--calendarId primary]',
      'gw gmail_search --query "..." --max 20',
      'gw drive_search --query "..." --max 20',
    ],
    config: {
      credentialsPath: CREDENTIALS_PATH,
      tokenPath: TOKEN_PATH,
    },
  });
}
