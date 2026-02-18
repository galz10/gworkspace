# gworkspace

Bun + TypeScript CLI that is a 1:1 wrapper over the Workspace MCP server tool surface.

## Commands

```bash
gworkspace tools list
gworkspace tools call --name time_getCurrentTime
gworkspace time_getCurrentTime
gworkspace calendar_getEvents --args '{"timeMin":"2026-02-18T00:00:00Z","timeMax":"2026-02-19T00:00:00Z"}'
```

## Server resolution order

1. `--server-cmd` and optional `--server-args`
2. `GWORKSPACE_SERVER_CMD` and optional `GWORKSPACE_SERVER_ARGS`
3. `~/Documents/Github/workspace/workspace-server/dist/index.js`
4. `gemini-workspace-server` in `PATH`

## Development

```bash
bun install
bun run check
bun run build
node dist/index.js --help
```
