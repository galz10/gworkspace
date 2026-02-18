import { google } from 'googleapis';
import { optNumber, optString } from '../lib/args.js';
import { fail, output } from '../lib/io.js';
import type { Options } from '../lib/types.js';

export async function commandDriveSearch(auth: any, options: Options) {
  const drive = google.drive({ version: 'v3', auth });
  const max = Math.max(1, Math.min(optNumber(options, 'max', 20), 200));

  const res = await drive.files.list({
    q: optString(options, 'query') || 'trashed = false',
    pageSize: max,
    fields: 'files(id,name,mimeType,modifiedTime,owners,webViewLink),nextPageToken',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  const files = res.data.files || [];
  output({
    ok: true,
    action: 'drive.search',
    count: files.length,
    nextPageToken: res.data.nextPageToken || null,
    files,
  });
}

export async function commandDriveRecent(auth: any, options: Options) {
  const drive = google.drive({ version: 'v3', auth });
  const max = Math.max(1, Math.min(optNumber(options, 'max', 20), 200));

  const res = await drive.files.list({
    q: 'trashed = false',
    orderBy: 'modifiedTime desc',
    pageSize: max,
    fields: 'files(id,name,mimeType,modifiedTime,owners,webViewLink),nextPageToken',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  output({
    ok: true,
    action: 'drive.recent',
    count: (res.data.files || []).length,
    files: res.data.files || [],
  });
}

export async function commandDriveGet(auth: any, options: Options) {
  const id = optString(options, 'id');
  if (!id) fail('Missing required --id for drive get.');

  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.get({
    fileId: id,
    fields: 'id,name,mimeType,modifiedTime,owners,webViewLink,size',
    supportsAllDrives: true,
  });

  output({ ok: true, action: 'drive.get', file: res.data });
}
