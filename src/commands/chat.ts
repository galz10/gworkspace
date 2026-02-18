import { google } from 'googleapis';
import { optNumber, optString } from '../lib/args.js';
import { fail, output } from '../lib/io.js';
import type { AnyRecord, Options } from '../lib/types.js';

export async function commandChatSpaces(auth: any, options: Options) {
  const chat = google.chat({ version: 'v1', auth });
  const max = Math.max(1, Math.min(optNumber(options, 'max', 20), 1000));

  const res = await chat.spaces.list({
    pageSize: max,
    pageToken: optString(options, 'pageToken'),
    filter: optString(options, 'filter'),
  });

  const spaces = res.data.spaces || [];
  output({
    ok: true,
    action: 'chat.spaces',
    count: spaces.length,
    nextPageToken: res.data.nextPageToken || null,
    spaces: spaces.map((space: AnyRecord) => ({
      name: space.name,
      displayName: space.displayName,
      spaceType: space.spaceType,
      spaceThreadingState: space.spaceThreadingState,
      createTime: space.createTime,
      lastActiveTime: space.lastActiveTime,
      membershipCount: space.membershipCount,
      singleUserBotDm: space.singleUserBotDm,
      externalUserAllowed: space.externalUserAllowed,
    })),
  });
}

export async function commandChatMessages(auth: any, options: Options) {
  const parent = optString(options, 'space');
  if (!parent) fail('Missing required --space for chat messages.');

  const chat = google.chat({ version: 'v1', auth });
  const max = Math.max(1, Math.min(optNumber(options, 'max', 20), 1000));

  const res = await chat.spaces.messages.list({
    parent,
    pageSize: max,
    pageToken: optString(options, 'pageToken'),
    filter: optString(options, 'filter'),
    orderBy: optString(options, 'orderBy'),
  });

  const messages = res.data.messages || [];
  output({
    ok: true,
    action: 'chat.messages',
    space: parent,
    count: messages.length,
    nextPageToken: res.data.nextPageToken || null,
    messages: messages.map((message: AnyRecord) => ({
      name: message.name,
      createTime: message.createTime,
      lastUpdateTime: message.lastUpdateTime,
      sender: message.sender?.name || null,
      thread: message.thread?.name || null,
      text: message.text || '',
      argumentText: message.argumentText || '',
    })),
  });
}
