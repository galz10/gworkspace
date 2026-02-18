# Command Reference

## Auth

- `gworkspace auth login [--credentials <path>] [--no-open]`
- `gworkspace auth status`
- `gworkspace auth logout`

## Calendar

- `gworkspace calendar list --from <ISO> --to <ISO> [--calendarId primary] [--max 20]`
- Alias: `gworkspace calendar_getEvents --timeMin <ISO> --timeMax <ISO> [--calendarId primary] [--maxResults 20]`

## Gmail

- `gworkspace gmail search --query "<gmail_query>" [--max 20] [--pageToken <token>]`
- `gworkspace gmail get --id <message_id>`
- Alias: `gworkspace gmail_search --query "<gmail_query>" [--max 20]`

## Drive

- `gworkspace drive search --query "<drive_query>" [--max 20]`
- `gworkspace drive recent [--max 20]`
- `gworkspace drive get --id <file_id>`
- Alias: `gworkspace drive_search --query "<drive_query>" [--max 20]`

## Time

- `gworkspace time now`
- `gworkspace time date`
- `gworkspace time zone`

## Query examples

Gmail:

- `newer_than:7d`
- `from:alice@example.com subject:\"roadmap\"`

Drive:

- `trashed = false`
- `name contains 'Q1' and trashed = false`

Calendar:

- `--from 2026-02-18T00:00:00Z --to 2026-02-19T00:00:00Z`
