# gworkspace

`gworkspace` is a native Google Workspace CLI with Workspace MCP-like capabilities, but no MCP runtime in the middle.
It is built for direct execution: less ceremony, more signal.

## What it does

- Browser-based OAuth login (localhost callback)
- Calendar read access (event listing)
- Gmail read access (search + metadata fetch)
- Drive read access (search + recent + file metadata)
- Time utilities for reliable local/UTC context
- Compatibility aliases for Workspace-style command names

## Quick start

1. Create a Google Cloud **Desktop OAuth client**.
2. Save credentials JSON to:
   - `~/.config/gworkspace/credentials.json` (default), or
   - pass `--credentials /path/to/credentials.json`, or
   - set `GOOGLE_OAUTH_CREDENTIALS`.

```bash
gworkspace auth login
gworkspace auth status
gworkspace time now
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
gworkspace --help
```

## Common workflows

### Morning context pull

```bash
gworkspace time now
gworkspace calendar list --from 2026-02-18T00:00:00Z --to 2026-02-18T23:59:59Z
gworkspace gmail search --query "newer_than:1d" --max 20
```

### Project document scan

```bash
gworkspace drive search --query "name contains 'spec' and trashed = false"
gworkspace drive get --id <fileId>
```

### Message triage

```bash
gworkspace gmail search --query "is:unread newer_than:7d" --max 25
gworkspace gmail get --id <messageId>
```

## Command surface

### Auth

- `gworkspace auth login [--credentials path/to/credentials.json] [--no-open]`
- `gworkspace auth status`
- `gworkspace auth logout`

### Calendar

- `gworkspace calendar list --from <ISO> --to <ISO> [--calendarId primary] [--max 20]`

### Gmail

- `gworkspace gmail search --query "<gmail query>" [--max 20] [--pageToken <token>]`
- `gworkspace gmail get --id <messageId>`

### Drive

- `gworkspace drive search --query "<drive query>" [--max 20]`
- `gworkspace drive recent [--max 20]`
- `gworkspace drive get --id <fileId>`

### Time

- `gworkspace time now`
- `gworkspace time date`
- `gworkspace time zone`

## Workspace-style aliases (compat)

```bash
gworkspace calendar_getEvents --timeMin 2026-02-18T00:00:00Z --timeMax 2026-02-19T00:00:00Z
gworkspace gmail_search --query "newer_than:7d" --max 20
gworkspace drive_search --query "trashed = false" --max 20
```

## Security notes

- OAuth credentials and tokens are stored locally, not committed by default.
- Scopes are read-only:
  - `calendar.readonly`
  - `gmail.readonly`
  - `drive.readonly`
- If you rotate credentials, run `gworkspace auth logout` then `gworkspace auth login`.

## Troubleshooting

- `Credentials file not found`
  - Check `~/.config/gworkspace/credentials.json` or pass `--credentials`.
- Browser did not open
  - Run `gworkspace auth login --no-open` and open the URL manually.
- Login timeout
  - Re-run login and complete consent in the browser within the timeout window.
- `No token found`
  - Run `gworkspace auth login` first.

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
