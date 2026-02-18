import type { Options, Primitive } from './types.js';

export function parseArgs(argv: string[]) {
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

export function optString(options: Options, key: string): string | undefined {
  const value = options[key];
  if (value === undefined || typeof value === 'boolean') return undefined;
  if (Array.isArray(value)) return String(value[value.length - 1]);
  return String(value);
}

export function optNumber(options: Options, key: string, fallback: number): number {
  const raw = optString(options, key);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}
