import {
  authorize,
  commandAuthLogin,
  commandAuthLogout,
  commandAuthStatus,
} from './auth/index.js';
import { resolveCredentialsPath } from './config.js';
import { commandCalendarList } from './commands/calendar.js';
import { commandDriveGet, commandDriveRecent, commandDriveSearch } from './commands/drive.js';
import { commandGmailGet, commandGmailSearch } from './commands/gmail.js';
import { commandTimeDate, commandTimeNow, commandTimeZone } from './commands/time.js';
import { optString, parseArgs } from './lib/args.js';
import { fail } from './lib/io.js';
import type { Options } from './lib/types.js';
import { usage } from './usage.js';

export async function runCli(argv: string[]) {
  const { positional, options } = parseArgs(argv);
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
