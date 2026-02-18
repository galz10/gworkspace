import type { JsonObject } from './types.js';

export function output(payload: JsonObject, code = 0): never {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(code);
}

export function fail(message: string, details?: unknown): never {
  output(
    {
      ok: false,
      error: message,
      details: details ?? null,
    },
    1,
  );
}
