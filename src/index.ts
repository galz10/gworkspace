#!/usr/bin/env node

import { runCli } from './cli.js';
import { fail } from './lib/io.js';

runCli(process.argv.slice(2)).catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  fail('Command failed.', msg);
});
