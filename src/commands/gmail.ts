import { google } from 'googleapis';
import { optNumber, optString } from '../lib/args.js';
import { fail, output } from '../lib/io.js';
import type { AnyRecord, Options } from '../lib/types.js';

export async function commandGmailSearch(auth: any, options: Options) {
  const gmail = google.gmail({ version: 'v1', auth });
  const max = Math.max(1, Math.min(optNumber(options, 'max', 20), 100));

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: optString(options, 'query') || '',
    maxResults: max,
    pageToken: optString(options, 'pageToken'),
  });

  const messages = res.data.messages || [];
  output({
    ok: true,
    action: 'gmail.search',
    query: optString(options, 'query') || '',
    count: messages.length,
    nextPageToken: res.data.nextPageToken || null,
    messages: messages.map((m: AnyRecord) => ({ id: m.id, threadId: m.threadId })),
  });
}

export async function commandGmailGet(auth: any, options: Options) {
  const id = optString(options, 'id');
  if (!id) fail('Missing required --id for gmail get.');

  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.messages.get({
    userId: 'me',
    id,
    format: 'metadata',
    metadataHeaders: ['From', 'To', 'Subject', 'Date'],
  });

  const headers = res.data.payload?.headers || [];
  const map = headers.reduce<Record<string, string>>((acc, h: AnyRecord) => {
    if (h.name && h.value) acc[h.name.toLowerCase()] = h.value;
    return acc;
  }, {});

  output({
    ok: true,
    action: 'gmail.get',
    message: {
      id: res.data.id,
      threadId: res.data.threadId,
      labelIds: res.data.labelIds || [],
      snippet: res.data.snippet || '',
      subject: map.subject || '',
      from: map.from || '',
      to: map.to || '',
      date: map.date || '',
      internalDate: res.data.internalDate || null,
    },
  });
}
