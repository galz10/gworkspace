# gw

`gw` is a native Google Workspace CLI with Workspace MCP-like capabilities, but no MCP runtime in the middle.
It is built for direct execution: less ceremony, more signal.

## What it does

- Browser-based OAuth login (localhost callback)
- Calendar read access (event listing)
- Gmail read access (search + metadata fetch)
- Drive read access (search + recent + file metadata)
- Google Chat read access (spaces + messages)
- Time utilities for reliable local/UTC context
- Compatibility aliases for Workspace-style command names

## Quick start

1. Default auth mode is `mcp` (no local credentials file required).
2. Optional local auth mode:
   - create a Google Cloud **Desktop OAuth client**,
   - save JSON to `~/.config/gworkspace/credentials.json`, or pass `--credentials`.

```bash
gw auth login
gw auth status
gw time now
```

`auth login` opens your browser, waits for OAuth callback on localhost, then stores token at `~/.config/gworkspace/token.json`.

## Install and run

### Run from source

```bash
bun install
bun run build
node dist/index.js --help
```

### Install globally (optional)

```bash
bun install -g .
gw --help
```

### Help

```bash
gw --help
gw -h
gw help
gw help auth
gw auth --help
```

## Common workflows

### Morning context pull

```bash
gw time now
gw calendar list --from 2026-02-18T00:00:00Z --to 2026-02-18T23:59:59Z
gw gmail search --query "newer_than:1d" --max 20
```

### Project document scan

```bash
gw drive search --query "name contains 'spec' and trashed = false"
gw drive get --id <fileId>
```

### Message triage

```bash
gw gmail search --query "is:unread newer_than:7d" --max 25
gw gmail get --id <messageId>
```

## Command surface

### Auth

- `gw auth login [--auth-mode mcp|local] [--credentials path/to/credentials.json] [--no-open]`
- `gw auth status`
- `gw auth logout`

### Calendar

- `gw calendar list --from <ISO> --to <ISO> [--calendarId primary] [--max 20]`

### Gmail

- `gw gmail search --query "<gmail query>" [--max 20] [--pageToken <token>]`
- `gw gmail get --id <messageId>`

### Drive

- `gw drive search --query "<drive query>" [--max 20]`
- `gw drive recent [--max 20]`
- `gw drive get --id <fileId>`

### Time

- `gw time now`
- `gw time date`
- `gw time zone`

### Chat

- `gw chat spaces [--max 20] [--filter "spaceType = SPACE"] [--pageToken <token>]`
- `gw chat messages --space spaces/<spaceId> [--max 20] [--orderBy "createTime desc"] [--pageToken <token>]`

## Workspace-style aliases (compat)

```bash
gw calendar_getEvents --timeMin 2026-02-18T00:00:00Z --timeMax 2026-02-19T00:00:00Z
gw gmail_search --query "newer_than:7d" --max 20
gw drive_search --query "trashed = false" --max 20
```

## Security notes

- OAuth tokens are stored locally, not committed by default.
- Default mode is `mcp`; local mode uses credentials JSON.
- Scopes are read-only:
  - `calendar.readonly`
  - `gmail.readonly`
  - `drive.readonly`
  - `chat.spaces.readonly`
  - `chat.messages.readonly`
- If you rotate credentials, run `gw auth logout` then `gw auth login`.

## Troubleshooting

- `Credentials file not found`
  - Run with `--auth-mode mcp`, or provide local credentials via `--auth-mode local --credentials ...`.
- Browser did not open
  - Run `gw auth login --no-open` and open the URL manually.
- Login timeout
  - Re-run login and complete consent in the browser within the timeout window.
- `No token found`
  - Run `gw auth login` first.

## Docs

- `docs/auth.md` - OAuth browser flow, token storage, and troubleshooting.
- `docs/commands.md` - full command reference and examples.

## Repo layout

```text
src/
  index.ts            # tiny entrypoint
  cli.ts              # command routing
  usage.ts            # help output
  config.ts           # paths + scopes
  auth/
    index.ts          # auth commands + authorize()
    oauth.ts          # browser OAuth flow
    token.ts          # token read/write/delete
  commands/
    calendar.ts
    gmail.ts
    drive.ts
    chat.ts
    time.ts
  lib/
    args.ts           # argv parsing helpers
    io.ts             # JSON output + fail handling
    types.ts          # shared types
```

## Development

```bash
bun run check
bun run build
node dist/index.js --help
```
