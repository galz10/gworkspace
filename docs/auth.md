# Auth Flow

`gw auth login` defaults to MCP mode and uses a browser OAuth loop:

1. Start a localhost callback server on a random free port.
2. Generate Google OAuth URL with the configured scopes.
3. Open the browser automatically.
4. Receive callback at `/oauth2callback`.
5. Exchange auth code for tokens and store token JSON.

## Modes

- `mcp` (default): no local credentials file required; uses Workspace MCP cloud-function exchange.
- `local`: requires Desktop OAuth credentials JSON and performs direct local token exchange.

## Files

- Credentials: `~/.config/gworkspace/credentials.json` (default)
- Token: `~/.config/gworkspace/token.json`

Use local mode with explicit credentials path:

```bash
gw auth login --auth-mode local --credentials /path/to/credentials.json
```

Or env var:

```bash
export GOOGLE_OAUTH_CREDENTIALS=/path/to/credentials.json
```

## Flags

- `--auth-mode`: `mcp` (default) or `local`.
- `--no-open`: prints/uses auth URL without auto-launching browser.
- `--credentials`: explicit credentials file path (used in `local` mode).

## Scope updates

If new scopes are added (for example Chat read-only scopes), your existing token may not include them.
Run:

```bash
gw auth logout
gw auth login
```

## Troubleshooting

- `Credentials file not found`: use `--auth-mode local` only when file exists.
- `Invalid credentials file`: use Desktop OAuth client JSON with `installed` or `web` payload.
- `Authentication timed out`: reopen login and complete consent in browser within 5 minutes.
