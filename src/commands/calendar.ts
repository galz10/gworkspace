import { google } from 'googleapis';
import { optNumber, optString } from '../lib/args.js';
import { output } from '../lib/io.js';
import type { AnyRecord, Options } from '../lib/types.js';

function getTodayRangeIso() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function commandCalendarList(auth: any, options: Options) {
  const calendar = google.calendar({ version: 'v3', auth });
  const fromOption = optString(options, 'from');
  const toOption = optString(options, 'to');
  const useToday = options.today === true;
  const todayRange = getTodayRangeIso();
  const now = new Date();
  const from = fromOption || (useToday ? todayRange.start : now.toISOString());
  const to = toOption || (useToday ? todayRange.end : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString());
  const max = Math.max(1, Math.min(optNumber(options, 'max', 20), 250));

  const res = await calendar.events.list({
    calendarId: optString(options, 'calendarId') || 'primary',
    timeMin: from,
    timeMax: to,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: max,
  });

  const items = res.data.items || [];
  output({
    ok: true,
    action: 'calendar.list',
    today: useToday,
    from,
    to,
    count: items.length,
    events: items.map((item: AnyRecord) => ({
      id: item.id,
      status: item.status,
      summary: item.summary,
      description: item.description,
      start: item.start,
      end: item.end,
      htmlLink: item.htmlLink,
    })),
  });
}
