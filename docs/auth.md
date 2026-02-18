# Auth Flow

`gw auth login` uses a browser OAuth loop with Google Desktop OAuth credentials:

1. Start a localhost callback server on a random free port.
2. Generate Google OAuth URL with the configured scopes.
3. Open the browser automatically.
4. Receive callback at `/oauth2callback`.
5. Exchange auth code for tokens and store token JSON.

## Files

- Credentials: `~/.config/gworkspace/credentials.json` (default)
- Token: `~/.config/gworkspace/token.json`

Use an explicit credentials path:

```bash
gw auth login --credentials /path/to/credentials.json
```

Or env var:

```bash
export GOOGLE_OAUTH_CREDENTIALS=/path/to/credentials.json
```

## Flags

- `--no-open`: prints/uses auth URL without auto-launching browser.
- `--credentials`: explicit Desktop OAuth credentials file path.

## Create Credentials (Google Cloud Console)

1. Open Google Cloud Console, select or create a project.
2. Enable APIs you need: Calendar, Gmail, Drive, Google Chat.
3. Configure OAuth consent screen.
4. Go to Credentials -> Create Credentials -> OAuth client ID.
5. Select Application type `Desktop app`.
6. Download the JSON and save it as `~/.config/gworkspace/credentials.json`.

## Scope updates

If new scopes are added (for example Chat read-only scopes), your existing token may not include them.
Run:

```bash
gw auth logout
gw auth login
```

## Troubleshooting

- `Credentials file not found`: create/download Desktop OAuth credentials and pass `--credentials`, or place the file at `~/.config/gworkspace/credentials.json`.
- `Invalid credentials file`: use Desktop OAuth client JSON with `installed` or `web` payload.
- `Authentication timed out`: reopen login and complete consent in browser within 5 minutes.
