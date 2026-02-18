import { output } from '../lib/io.js';

export function commandTimeNow() {
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

export function commandTimeDate() {
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

export function commandTimeZone() {
  output({
    ok: true,
    action: 'time.zone',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}
