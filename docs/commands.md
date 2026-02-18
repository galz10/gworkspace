# Command Reference

## Auth

- `gw auth login [--credentials <path>] [--no-open]`
- `gw auth status`
- `gw auth logout`

## Calendar

- `gw calendar list --from <ISO> --to <ISO> [--calendarId primary] [--max 20]`
- Alias: `gw calendar_getEvents --timeMin <ISO> --timeMax <ISO> [--calendarId primary] [--maxResults 20]`

## Gmail

- `gw gmail search --query "<gmail_query>" [--max 20] [--pageToken <token>]`
- `gw gmail get --id <message_id>`
- Alias: `gw gmail_search --query "<gmail_query>" [--max 20]`

## Drive

- `gw drive search --query "<drive_query>" [--max 20]`
- `gw drive recent [--max 20]`
- `gw drive get --id <file_id>`
- Alias: `gw drive_search --query "<drive_query>" [--max 20]`

## Chat

- `gw chat spaces [--max 20] [--filter "spaceType = SPACE"] [--pageToken <token>]`
- `gw chat messages --space spaces/<space_id> [--max 20] [--orderBy "createTime desc"] [--pageToken <token>]`

## Time

- `gw time now`
- `gw time date`
- `gw time zone`

## Query examples

Gmail:

- `newer_than:7d`
- `from:alice@example.com subject:\"roadmap\"`

Drive:

- `trashed = false`
- `name contains 'Q1' and trashed = false`

Calendar:

- `--from 2026-02-18T00:00:00Z --to 2026-02-19T00:00:00Z`
