#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

type Primitive = string | boolean;
type OptValue = Primitive | Primitive[];
type Opts = Record<string, OptValue>;
type Json = Record<string, unknown>;

function fail(error: string, code = 1): never {
  process.stderr.write(`${error}\n`);
  process.exit(code);
}

function out(payload: Json, code = 0): never {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(code);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const options: Opts = {};

  const pushOpt = (key: string, value: Primitive) => {
    const current = options[key];
    if (current === undefined) {
      options[key] = value;
      return;
    }
    if (Array.isArray(current)) {
      options[key] = [...current, value];
      return;
    }
    options[key] = [current, value];
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }

    const eq = token.indexOf('=');
    if (eq > 2) {
      const key = token.slice(2, eq);
      pushOpt(key, token.slice(eq + 1));
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      pushOpt(key, true);
      continue;
    }
    pushOpt(key, next);
    i += 1;
  }

  return { positional, options };
}

function optString(options: Opts, key: string): string | undefined {
  const value = options[key];
  if (Array.isArray(value)) return value[value.length - 1]?.toString();
  if (value === undefined || typeof value === 'boolean') return undefined;
  return value.toString();
}

function getServerParams(options: Opts) {
  const explicitCmd = optString(options, 'server-cmd');
  const explicitArgs = optString(options, 'server-args');
  if (explicitCmd) {
    return {
      command: explicitCmd,
      args: explicitArgs ? explicitArgs.split(' ').filter(Boolean) : [],
    };
  }

  const envCmd = process.env.GWORKSPACE_SERVER_CMD;
  const envArgs = process.env.GWORKSPACE_SERVER_ARGS;
  if (envCmd) {
    return {
      command: envCmd,
      args: envArgs ? envArgs.split(' ').filter(Boolean) : [],
    };
  }

  const localWorkspaceServer = join(
    homedir(),
    'Documents',
    'Github',
    'workspace',
    'workspace-server',
    'dist',
    'index.js',
  );
  if (existsSync(localWorkspaceServer)) {
    return { command: 'node', args: [localWorkspaceServer] };
  }

  return { command: 'gemini-workspace-server', args: [] };
}

function parseArgsJson(options: Opts): Record<string, unknown> {
  const raw = optString(options, 'args');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    fail('--args must be a JSON object');
  } catch {
    fail('--args is not valid JSON');
  }
}

function collectImplicitToolArgs(options: Opts): Record<string, unknown> {
  const reserved = new Set([
    'help',
    'h',
    'name',
    'args',
    'server-cmd',
    'server-args',
    'version',
    'v',
  ]);
  const outArgs: Record<string, unknown> = {};
  Object.entries(options).forEach(([key, value]) => {
    if (reserved.has(key)) return;
    outArgs[key] = value;
  });
  return outArgs;
}

function usage() {
  out({
    ok: true,
    name: 'gworkspace',
    description: '1:1 CLI wrapper for Workspace MCP server tools',
    commands: [
      'gworkspace tools list',
      'gworkspace tools call --name <tool_name> --args \'{"k":"v"}\'',
      'gworkspace <tool_name> --args \'{"k":"v"}\'',
    ],
    server: {
      defaultResolution: [
        '--server-cmd/--server-args',
        'env: GWORKSPACE_SERVER_CMD/GWORKSPACE_SERVER_ARGS',
        '~/Documents/Github/workspace/workspace-server/dist/index.js',
        'gemini-workspace-server on PATH',
      ],
    },
  });
}

function resolveToolName(name: string, available: Set<string>): string {
  if (available.has(name)) return name;
  const dotToUnderscore = name.replace(/\./g, '_');
  if (available.has(dotToUnderscore)) return dotToUnderscore;
  const underscoreToDot = name.replace(/_/g, '.');
  if (available.has(underscoreToDot)) return underscoreToDot;
  return name;
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  if (!positional.length || options.help || options.h) usage();
  if (options.version || options.v) out({ ok: true, version: '0.2.0' });

  const server = getServerParams(options);
  const transport = new StdioClientTransport({
    command: server.command,
    args: server.args,
    stderr: 'inherit',
  });
  const client = new Client({
    name: 'gworkspace',
    version: '0.2.0',
  });
  client.onerror = (err: Error) => {
    process.stderr.write(`MCP client error: ${err.message}\n`);
  };

  try {
    await client.connect(transport);
    const [scope, action] = positional;

    if (scope === 'tools' && action === 'list') {
      const result = await client.listTools();
      out({
        ok: true,
        count: result.tools.length,
        tools: result.tools.map((tool: {
          name: string;
          description?: string;
          inputSchema?: unknown;
          outputSchema?: unknown;
        }) => ({
          name: tool.name,
          description: tool.description ?? '',
          inputSchema: tool.inputSchema ?? null,
          outputSchema: tool.outputSchema ?? null,
        })),
      });
    }

    const toolName =
      scope === 'tools' && action === 'call'
        ? optString(options, 'name') || positional[2]
        : scope;

    if (!toolName) usage();

    const tools = await client.listTools();
    const names = new Set(
      tools.tools.map((t: { name: string }) => t.name),
    );
    const resolvedToolName = resolveToolName(toolName, names);
    if (!names.has(resolvedToolName)) {
      fail(`Unknown tool '${toolName}'. Run 'gworkspace tools list' first.`);
    }

    const explicitArgs = parseArgsJson(options);
    const implicitArgs = collectImplicitToolArgs(options);
    const callArgs = { ...implicitArgs, ...explicitArgs };
    const result = await client.callTool({
      name: resolvedToolName,
      arguments: callArgs,
    });

    out({
      ok: !result.isError,
      tool: resolvedToolName,
      arguments: callArgs,
      result,
    });
  } finally {
    await transport.close().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : `Unhandled error: ${String(error)}`;
  fail(message);
});
