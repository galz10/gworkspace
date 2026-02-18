# gworkspace

Native Google Workspace CLI (no MCP protocol). It gives you Workspace MCP-like capabilities in direct CLI form.

## Quick start

1. Create a Desktop OAuth client in Google Cloud.
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

## Core commands

```bash
gworkspace calendar list --from 2026-02-18T00:00:00Z --to 2026-02-19T00:00:00Z --max 20
gworkspace gmail search --query "newer_than:7d" --max 20
gworkspace gmail get --id <messageId>
gworkspace drive recent --max 20
gworkspace drive search --query "name contains 'spec' and trashed = false"
gworkspace drive get --id <fileId>
gworkspace time now
```

## Workspace-style aliases (compat style)

```bash
gworkspace calendar_getEvents --timeMin 2026-02-18T00:00:00Z --timeMax 2026-02-19T00:00:00Z
gworkspace gmail_search --query "newer_than:7d" --max 20
gworkspace drive_search --query "trashed = false" --max 20
```

## Docs

- `docs/auth.md` - OAuth browser flow, token storage, and troubleshooting.
- `docs/commands.md` - full command reference and examples.

## Development

```bash
bun install
bun run check
bun run build
node dist/index.js --help
```
