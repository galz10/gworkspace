import { CREDENTIALS_PATH, TOKEN_PATH } from './config.js';
import { output } from './lib/io.js';

export function usage(): never {
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
