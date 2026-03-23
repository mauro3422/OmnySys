# Daemon-Managed Lifecycle Notes

**Status**: Draft temporal  
**Scope**: startup, client bootstrap, reconnect, restart boundary  
**Last verified**: 2026-03-23

This note collects what we learned while tracing OmnySys startup and client
connection paths. It is intentionally temporary. The runtime is still moving,
so this document should be treated as working notes until the supervisor and
freshness policy are fully stabilized.

## Core Idea

OmnySys is not a different system per client. It is one shared daemon with
multiple adapters.

Each client gets the transport and config shape it needs, but they all point
to the same runtime backend, the same daemon-owned state, and the same
persistent data store. The client-specific part is only the connection layer
and session recovery behavior, not the core data model.

That means:

- one daemon process owns the runtime
- multiple clients can stay alive at the same time
- each client can reconnect independently
- the daemon records and reconciles the shared state
- stale/restart state should be advisory, not a hard user-facing failure unless
  the runtime truly cannot recover

## What Exists Today

The system does not have a single "startup path". It has several layers that
touch lifecycle:

- `install.js` standardizes client configs, workspace files, VS Code task
  settings, and terminal autostart.
- `src/cli/commands/up.js` is the CLI entrypoint that starts or gracefully
  restarts the daemon.
- `src/layer-c-memory/mcp-http-proxy.js` is the long-lived parent supervisor.
  It spawns `mcp-http-server.js` as a worker and keeps port `9999` alive.
- `src/layer-c-memory/mcp-http-server.js` serves the actual MCP HTTP
  endpoint, health endpoint, restart endpoint, and tool registry.
- `src/layer-c-memory/mcp-stdio-bridge.js` bridges stdio clients to the HTTP
  daemon and can auto-start the daemon if it is not available.
- `src/layer-c-memory/mcp/core/session-manager.js` deduplicates sessions by
  `client_id` and can re-adopt a client session after a restart.
- `src/cli/utils/mcp-standardizer/*` writes client configs and workspace
  config for the supported IDEs/CLIs.
- `scripts/mcp-autostart.js` is the shell-profile auto-start hook.
- `src/core/unified-server/initialization/*` is a separate internal startup
  pipeline used by the unified server stack.
- `src/layer-c-memory/mcp/restart-runtime.js` is the controlled runtime
  restart tool used by the daemon.

## Actual Flow

### 1. Setup and standardization

The standardizer writes the connection data to the right place for each
client:

- global client config
- workspace `.mcp.json`
- `mcp-servers.json`
- VS Code task/settings
- shell profile autostart

This is performed by `install.js` or by the dedicated CLI setup commands.

### 2. Daemon startup

The daemon should be treated as the shared backend:

```text
workspace / terminal / CLI
        -> daemon supervisor
        -> HTTP proxy on :9999
        -> worker server
```

The proxy is the process that should remain alive. The worker is the process
that can be replaced when runtime code changes.

### 3. Client connection

There are two main transport families:

- HTTP direct: clients connect straight to the daemon URL.
- STDIO bridge: the client launches `mcp-stdio-bridge.js`, which in turn
  starts or reconnects to the daemon.

The bridge caches the initialize handshake and can replay it after reconnect.
That is what allows a client session to survive daemon restarts without the
user doing manual recovery.

The important detail is that the bridge does not own the data model. It only
keeps the client connected to the daemon and replays the minimum handshake
needed to restore the session.

### 4. Session reuse

`SessionManager` stores session metadata in SQLite and deduplicates by
`client_id`. If the same client reconnects within the reuse window, the prior
session can be re-adopted instead of creating a duplicate connection storm.

### 5. Controlled restart

The restart boundary already exists:

- `restart-runtime.js` can clear cache only.
- It can force reindex without dropping the daemon process.
- In proxy mode it can request a real worker restart while the parent proxy
  stays alive.

This is the right place to keep future lifecycle automation.

## Client Map

| Client or surface | Transport | Notes |
| --- | --- | --- |
| Claude CLI | HTTP direct | Uses daemon URL written by the standardizer. |
| Gemini CLI | HTTP direct | Also points to the shared daemon URL. |
| Cline in VS Code / Cursor | Streamable HTTP | Configured to talk to the daemon directly. |
| OpenCode | Remote HTTP | Uses the shared daemon URL. |
| Codex | STDIO bridge | Launches the bridge, which can start the daemon. |
| Qwen | STDIO bridge | Uses bridge + auto-start. |
| Antigravity | STDIO bridge | Uses bridge + auto-start and session replay. |
| VS Code folder task | Shell task | Starts the daemon automatically on folder open. |

## What We Learned

1. The proxy is the real lifecycle supervisor for the shared MCP daemon.
2. The bridge is not just a transport shim. It is a recovery layer that can
   start the daemon, reconnect, and replay initialization.
3. All clients are adapters over the same daemon, not separate systems.
4. `restartRequired` should be treated as a supervisor signal, not always as a
   hard error.
5. `stale` should mean "needs reconciliation or reload", not necessarily
   "broken".
6. The system has two separate initialization stacks:
   - the MCP daemon stack
   - the unified server stack
7. There is no in-repo VS Code extension manifest. The VS Code integration is
   currently workspace tasks and settings, not a custom extension package.

## Current Pain Points

- Restart responsibility is split across CLI, VS Code task, terminal
  autostart, the bridge, and the proxy.
- Manual reloads are still too frequent because the restart boundary is not yet
  centralized.
- The runtime sometimes reports `restartRequired` or `stale` too aggressively
  for the user's workflow.
- Some health/status surfaces still mix "bootstrap snapshot" with live runtime
  state.

## Preferred Direction

The next architecture step should be a single daemon-managed restart boundary:

1. Keep the proxy long-lived.
2. Restart only the worker when reloadable runtime code changes.
3. Batch reload-worthy changes instead of restarting for every file.
4. Let the bridge recover clients automatically after daemon restarts.
5. Surface freshness as advisory state, not as a forced manual action whenever
   possible.
6. Keep the shared daemon as the only place that records canonical runtime
   state.

## Files To Watch

- `src/layer-c-memory/mcp-http-proxy.js`
- `src/layer-c-memory/mcp-http-server.js`
- `src/layer-c-memory/mcp-stdio-bridge.js`
- `src/layer-c-memory/mcp/core/session-manager.js`
- `src/layer-c-memory/mcp/restart-runtime.js`
- `src/cli/commands/up.js`
- `src/cli/utils/mcp-standardizer/index.js`
- `src/cli/utils/mcp-standardizer/workspace.js`
- `src/cli/utils/mcp-standardizer/clients.js`
- `scripts/mcp-autostart.js`
- `.vscode/tasks.json`
- `.vscode/settings.json`
- `src/core/unified-server/initialization/index.js`

## Notes For Future Cleanup

This note should probably be replaced later by two separate docs:

- a stable architecture doc for the daemon lifecycle
- a smaller client-setup guide for the supported transports

Until then, this file is the working summary of the current initialization
and client ecosystem.
