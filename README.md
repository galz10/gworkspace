# gworkspace

Bun + TypeScript CLI scaffold for Google Workspace context access.

## Commands

```bash
gworkspace auth status
gworkspace calendar list --from 2026-02-18T00:00:00Z --to 2026-02-19T00:00:00Z --max 20
gworkspace gmail search --query "newer_than:7d" --max 20
gworkspace drive recent --max 20
```

## Development

```bash
bun install
bun run check
bun run build
bun run src/index.ts --help
```
