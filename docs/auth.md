# Auth Flow

`gw auth login` uses an MCP-style browser OAuth loop:

1. Start a localhost callback server on a random free port.
2. Generate Google OAuth URL with the configured scopes.
3. Open the browser automatically.
4. Receive callback at `/oauth2callback`.
5. Exchange auth code for tokens and store token JSON.

## Files

- Credentials: `~/.config/gworkspace/credentials.json` (default)
- Token: `~/.config/gworkspace/token.json`

Override credentials path with:

```bash
gw auth login --credentials /path/to/credentials.json
```

Or env var:

```bash
export GOOGLE_OAUTH_CREDENTIALS=/path/to/credentials.json
```

## Flags

- `--no-open`: prints/uses auth URL without auto-launching browser.
- `--credentials`: explicit credentials file path.

## Scope updates

If new scopes are added (for example Chat read-only scopes), your existing token may not include them.
Run:

```bash
gw auth logout
gw auth login
```

## Troubleshooting

- `Credentials file not found`: verify file exists and path is correct.
- `Invalid credentials file`: use Desktop OAuth client JSON with `installed` or `web` payload.
- `Authentication timed out`: reopen login and complete consent in browser within 5 minutes.
