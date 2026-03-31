# Daemon-Managed Lifecycle Notes

**Status**: Draft temporal  
**Scope**: startup, client bootstrap, reconnect, restart boundary  
**Last verified**: 2026-03-30

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
- `src/layer-c-memory/mcp-http-session-routing.js` now exposes read-only MCP
  resources for discovery so the client can inspect live status without going
  through a tool call first.
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
- A healthy daemon does not guarantee a healthy Codex chat surface. If `/health`
  and direct MCP `initialize`/`tools/list` work but the chat still shows
  `Reconnecting...`, the likely fault is the client/app-server bridge, not the
  daemon.

## MCP Resources For Discovery

The daemon now exposes a small read-only resource surface in addition to the
tool catalog:

- `omnysys://status` - live runtime status and readiness snapshot.
- `omnysys://health` - boot/health summary equivalent to the `/health` view.
- `omnysys://sessions` - session persistence and deduplication summary.
- `omnysys://tools` - current tool registry snapshot and inventory report.
- `omnysys://schema` - MCP capability and runtime resource schema summary.

These resources are intentionally lightweight JSON snapshots. They give the
client something useful to list and read even before it starts invoking tools.
That reduces the chance of "empty catalog" discovery failures while keeping the
transport aligned with the official MCP `resources/list` and `resources/read`
shape.

## Incident Note - Reconnecting Loop After Hot-Reload Split

**Observed**: 2026-03-29
**Symptoms**:

- The IDE/chat surface stayed on `Reconnecting...` after the daemon had already
  come back healthy.
- The bridge logs showed repeated reconnect attempts after code changes in the
  hot-reload manager.
- The runtime emitted a crash trace with `Cannot read properties of undefined
  (reading 'emit')` from the hot-reload path.

**Root cause**:

- The hot-reload coordinator and reload handler were emitting lifecycle events
  with unguarded `server.emit(...)` calls.
- After the split, some recovery paths could reach those emit sites while the
  server object was only partially initialized.
- That crash interrupted the hot-reload flow and made the client appear to be
  stuck in a reconnect loop even though the daemon itself was still healthy.

**Fix applied**:

- Guarded lifecycle emissions in
  `src/layer-c-memory/mcp/core/hot-reload-manager/restart-coordinator.js`.
- Guarded the reload handler emissions in
  `src/layer-c-memory/mcp/core/hot-reload-manager/handlers/reload-handler.js`.
- Added regression coverage in:
  - `tests/unit/layer-c-memory/mcp/restart-coordinator.test.js`
  - `tests/unit/layer-c-memory/mcp/reload-handler.test.js`

**Verification**:

- `npm test -- --run tests/unit/layer-c-memory/mcp/restart-coordinator.test.js tests/unit/layer-c-memory/mcp/reload-handler.test.js`
- `node --check` on the two hot-reload modules
- MCP runtime status showed `runtimeCodeFresh: true` and `restartPending: false`
  after the fix

**Follow-up**:

- Keep the reconnect surface documented as a transport symptom, not a daemon
  outage, unless `/health` or direct MCP `initialize`/`tools/list` fail.
- If the symptom returns, inspect hot-reload event emission first before
  chasing session recovery or daemon restart code.

## Incident Note - Tool Call Reconnect Loop on Streamable HTTP

**Observed**: 2026-03-30
**Symptoms**:

- The chat surface could enter repeated `Reconnecting...` loops when a real MCP
  tool was invoked, even while the daemon stayed healthy.
- Direct shell checks still showed `/health` as healthy and the proxy/worker
  pair as alive.
- The reconnect symptom was worse during client reuse, stale workspace state,
  or when the transport resumed a broken stream instead of opening a fresh one.
- The symptom was reproduced again after a clean restart: a real tool call from
  the chat surface emitted `Reconnecting...` and then failed with
  `stream disconnected before completion`, even though the daemon boot finished
  in `A+`.

**Important distinction**:

- This is not the same bug as the earlier hot-reload crash trace.
- The older `Cannot read properties of undefined (reading 'emit')` issue was a
  lifecycle emission bug in the hot-reload path.
- The reconnect loop we saw today was a transport resumability problem on the
  Streamable HTTP path, not a dead daemon.

**Root cause**:

- `StreamableHTTPServerTransport` was being created without a shared event
  store, so the server could not resume streams cleanly after transient
  disconnects.
- The client/bridge could then retry the same session path and keep surfacing
  `Reconnecting...` even though the backend was still alive.
- The recovery replay also needed an explicit fresh-session hint so the
  SessionManager would not re-adopt the old `client_id` bucket and recreate the
  stale session loop.
- The session deduplication path originally reused only "fresh" client buckets,
  which meant older active sessions could survive long enough to accumulate into
  duplicate buckets. The save path now deduplicates against the latest active
  session for that client, even if the session is older than the reuse window.
- Stale client storage in the IDE could keep the old workspace/session shape in
  memory and make the reconnect symptom look worse than the backend actually
  was.

**Fix applied**:

- Added a shared `InMemoryEventStore` to
  `src/layer-c-memory/mcp-http-session-routing.js`.
- Passed that shared event store into every `StreamableHTTPServerTransport`
  instance so session streams can resume instead of looping on reconnect.
- Kept the bridge recovery logic conservative: when transport/session state is
  stale, prefer a fresh session over reusing a broken one.
- Propagated `force_fresh_session` through the recovery replay so the bridge and
  SessionManager both skip client-id reuse on a recovered transport.
- Tightened session deduplication so the latest active client session wins even
  when the previous one is older than the reuse window. This keeps old active
  rows from accumulating as duplicate buckets.
- Cleared stale VS Code/Codex state keys that were holding an outdated
  `gitRoot` and panel state.
- Added the bootstrap and Phase 2 telemetry snapshots so we can tell apart:
  - transport/session drift
  - database drift
  - deep scan slowness
  - stale snapshots that never reached SQLite

**Pattern of repair**:

1. Verify the daemon with `/health` and a direct MCP tool call.
2. If the daemon is healthy but the chat loops on `Reconnecting...`, treat it
   as a transport/session problem first.
3. Use a resumable transport with a shared event store for Streamable HTTP.
4. Force a fresh session after transport close, invalid session, or session
   expiry.
5. Ensure the recovery replay carries `force_fresh_session` through to the
   SessionManager so stale client-id buckets are not re-adopted.
6. Keep the session deduplication path strict enough to prune older active
   buckets, even when the reuse window would otherwise consider them stale.
7. Clear stale client cache/state if the IDE still points at the wrong
   workspace or keeps a faded/grey server toggle.
8. If a real tool call still drops the stream after a clean restart, treat it as
   client/session drift first and compare it against the latest bootstrap and
   Phase 2 telemetry before blaming the daemon.

**Self-healing session policy**:

- The SessionManager now reuses the latest active session for a client even if
  it is older than the dedup freshness window, so a returning client does not
  keep spawning duplicate buckets just because time passed.
- Every successful `saveSession()` pass now performs a global reconciliation of
  active buckets and prunes extra rows for any client that still has duplicates.
- This means the server can heal session drift opportunistically on the next
  real session write, instead of waiting for the IDE connector to recover first.

**Verification**:

- Direct MCP tool calls succeeded again after the transport change.
- The backend stayed healthy during reconnect reproduction attempts.
- The server now records the reconnect path as a session/transport issue, not
  as a daemon outage, when `/health` remains healthy.

**Root-cause discovery details**:

- The first compatibility patch looked correct in unit tests but still failed
  live with `406 Not Acceptable` when the client sent only
  `Accept: application/json`.
- The reason was subtle: mutating `req.headers.accept` was not enough for the
  live daemon path because the Node/Hono adapter used by the MCP SDK rebuilds
  the runtime `Headers` object from `IncomingMessage.rawHeaders`.
- The effective fix therefore had to normalize all relevant header surfaces on
  the incoming request:
  - `req.headers`
  - `req.headersDistinct`
  - `req.rawHeaders`
- This is why the final compatibility shim updates the raw Node request before
  `transport.handleRequest(...)` runs, instead of treating the Node headers bag
  as the only source of truth.
- It also explains why `clearCacheOnly` was not a sufficient validation path:
  router/transport fixes must be validated after a real worker reload, because
  the live endpoint behavior depends on the loaded HTTP adapter boundary, not
  only on cache state.

**Files involved**:

- `src/layer-c-memory/mcp-http-session-routing.js`
- `src/layer-c-memory/mcp/stdio-bridge-recovery.js`
- `src/layer-c-memory/mcp/core/hot-reload-manager/restart-coordinator.js`
- `src/layer-c-memory/mcp/core/hot-reload-manager/handlers/reload-handler.js`
- `src/layer-c-memory/mcp/core/session-manager.js`
- `tests/unit/layer-c-memory/mcp-http-session-routing.session.test.js`

**Follow-up**:

- Keep the reconnect surface documented as a transport symptom unless `/health`
  or direct MCP `initialize`/`tools/list` fail.
- If the symptom returns, inspect the client cache and the Streamable HTTP
  transport before chasing daemon restart code.

## Diagnosis Matrix

Use this matrix when the daemon looks healthy but the chat surface still loops
on `Reconnecting...` or loses tool access.

| Symptom | Likely layer | How to confirm | Practical fix or workaround |
| --- | --- | --- | --- |
| `/health` is healthy, tools are registered, but a real tool call loops on `Reconnecting...` | Client/transport | Compare shell health with a direct MCP tool call and the chat surface. If shell is fine and the chat still loops, the backend is probably not the fault. | Force a fresh session, clear stale Codex/VS Code state, and keep the bridge on resumable Streamable HTTP with a shared event store. |
| The MCP catalog is gray, missing, or empty in the IDE while CLI access still works | IDE cache / workspace state | Check whether the Codex/VS Code UI points at the correct workspace and whether the client logs mention stale session state. | Reload the IDE window, clear persisted connector state, and verify the workspace root/config before blaming the daemon. |
| `stream disconnected before completion` appears after a reconnect or session expiry | Session reuse | Look for `SESSION_EXPIRED`, `Invalid session`, or repeated reconnect attempts after transport close. | Start a fresh session instead of reusing the old `client_id` bucket; preserve `MCP-Session-Id` semantics and resumable transport. |
| Phase 2 takes too long or stalls near deep scan | Analysis pipeline | Compare `phase2TotalMs`, `phase2ThroughputItemsPerSec`, and parse-failure logs such as `extractDataFlow`. | Add parse-failure telemetry, keep the scan resumable, and treat unsupported snippets as a performance debt rather than a daemon outage. |

## Public Signals

Public reports that match this pattern usually split into two clusters:

- Codex IDE/connector issues where the daemon is alive but the UI does not
  refresh the tool catalog correctly.
- Streamable HTTP/session issues where reconnect works only if the session is
  resumed with the right transport state.

Relevant references:

- [openai/codex #6465](https://github.com/openai/codex/issues/6465)
- [openai/codex #4222](https://github.com/openai/codex/issues/4222)
- [openai/codex #6398](https://github.com/openai/codex/issues/6398)
- [openai/codex #4983](https://github.com/openai/codex/issues/4983)
- [openai/codex #4302](https://github.com/openai/codex/issues/4302)
- [MCP transports spec](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [typescript-sdk reconnect issue #731](https://github.com/modelcontextprotocol/typescript-sdk/issues/731)

## Bug-Mode Tracing

When the connector starts looping again or the tool path looks opaque, start the
daemon with bug-mode tracing instead of guessing from the chat surface:

- `node src/layer-c-memory/mcp-http-proxy.js --bug-mode`
- or `OMNYSYS_BUG_MODE=1`
- or `OMNYSYS_TRACE_TOOLS=1`
- or `OMNYSYS_TRACE_GUARDS=1`

Bug mode enables compact tool and guard traces in the server logs so you can
see:

- tool entry and exit summaries
- routed action context
- guard registration / validation summaries
- whether a session was recreated or deduplicated during recovery

Use this mode when:

- the IDE says `Reconnecting...` but `/health` still looks healthy
- the tool catalog is gray or partial in the chat UI
- `thread-stream-state-changed` appears without a matching handler in the
  client logs
- `plugins/list` or `plugins/featured` fails with `403` in the Codex/VS Code
  connector logs

The goal is not to replace the transport fix. It is to make the next failure
mode observable without depending on the chat connector to render the tool
response correctly.

## Client-Side Evidence

The Codex VS Code extension can fail even while the OmnySys daemon stays
healthy. The strongest signals we observed on the client side were:

- repeated `[IpcClient] Received broadcast but no handler is configured
  method=thread-stream-state-changed`
- remote plugin sync requests to `https://chatgpt.com/backend-api/plugins/list`
  and `.../featured` returning `403 Forbidden`
- the chat surface falling back to reconnect/search behavior even after the
  server booted `A+` and registered all `37` tools

This is a regression, not a normal performance characteristic. Earlier runs
were stable and fast enough that the tool path felt immediate; the new retry
loop and stall pattern is the bug we are tracking here.

Interpretation:

- `thread-stream-state-changed` is a connector-side broadcast mismatch, not a
  daemon crash.
- `plugins/list` and `plugins/featured` 403s indicate the extension is hitting
  a remote plugin sync path that can fail independently of OmnySys.
- When these appear together, the server can still be healthy and the chat
  surface can still look broken.

Practical consequence:

- Use shell health checks and direct server logs to confirm daemon health.
- Use bug-mode traces to see tool/guard flow when the connector is opaque.
- Treat connector drift separately from the OmnySys runtime until direct tool
  calls fail in shell as well.

## Retry Discipline

Do not treat the first successful tool call as proof that the reconnect loop is
gone.

If the chat or connector spent time cycling through `Reconnecting...`, keep the
earlier retries in scope until you see a stable sequence of tool calls or a
clean restart with no connector retry noise. A later success can coexist with
an earlier stale-session problem, especially when the connector is still
replaying old session state or falling back to remote plugin sync.

Use this rule when triaging:

- one successful tool call is evidence that the daemon path works
- repeated reconnect retries are still evidence of connector/session drift
- both signals can be true in the same session

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

## 2026-03-30 Compatibility Hardening

We added a second server-side defense for the Codex VS Code reconnect bug. The
session/event-store fixes were necessary, but they were not sufficient on their
own when the client came back after hot-reload, reindex, or runtime refresh
with degraded HTTP expectations.

What changed in the server:

- `src/layer-c-memory/mcp-http-session-routing.js` now creates each
  `StreamableHTTPServerTransport` with `enableJsonResponse: true`.
- The same router now normalizes degraded `Accept` headers before dispatching
  to the MCP SDK:
  - `POST /mcp` is upgraded to include both `application/json` and
    `text/event-stream`
  - `GET /mcp` is upgraded to include `text/event-stream`

Why this matters:

- The SDK transport is spec-strict and rejects `POST` requests with `406 Not
  Acceptable` when the client does not advertise both content types.
- In practice the Codex/VS Code connector can drift during reconnect windows
  and behave as if it only wants JSON while the daemon is still healthy.
- Returning JSON for regular `POST` request/response cycles is more compatible
  with chat-style tool clients that do not need per-request SSE streams.

Observed failure mode before the hardening:

- `/health` was healthy
- the daemon had valid sessions and the shared event store
- but `initialize` or `tools/list` could still stall or fall back because the
  connector never completed a clean tool handshake after reconnect

Operational rule:

- Treat `enableJsonResponse + Accept normalization` as part of the reconnect
  defense, not as a cosmetic compatibility tweak.
- Keep it enabled across hot-reload, worker restart, reindex, and bridge
  recovery paths unless a future client proves it no longer needs the shim.

Validation:

- direct shell handshake to `http://127.0.0.1:9999/mcp`
- unit coverage in `tests/unit/layer-c-memory/mcp-http-session-routing.test.js`
- unit coverage in `tests/unit/layer-c-memory/mcp-http-session-routing.session.test.js`

Important runtime note:

- `clearCacheOnly` is not enough when the change lives in the HTTP routing
  layer itself.
- For transport compatibility changes such as `Accept` normalization or JSON
  response mode, use a true worker/process restart so the live Express/Hono
  request path picks up the new code.

## 2026-03-30 Stale Session Reconnect Fix

The reconnect loop we chased in Mantice 04 was not Phase 2 work or a missing
daemon boot step. The daemon had already finished initialization. The bug was
in the recovery path: the bridge could carry a stale `mcp-session-id` forward
too aggressively after a transport close or session-expiration event.

What changed in the runtime:

- `src/layer-c-memory/mcp-http-session-routing.js`
  - `initialize` requests that arrive with a stale session id now recover by
    creating a fresh session instead of forcing a hard `SESSION_EXPIRED`
    failure.
- `src/layer-c-memory/mcp/stdio-bridge-recovery.js`
  - forced-fresh recovery now clears the cached session id before reconnecting
    so the replay cannot accidentally reuse a dead session bucket.
- `src/layer-c-memory/mcp/stdio-bridge-helpers.js`
  - initialize replay stays canonicalized so client identity metadata remains
    stable across reconnects.

Why this matters:

- It removes a reconnect loop that could look like a transport outage even
  when the daemon was already healthy.
- It keeps stale client state from re-adopting the old session bucket during
  replay.
- It makes the reconnect policy deterministic: stale session means fresh
  session, not retry storm.

Operational rule:

- If `/health` is healthy and `list_tools` works, treat repeated
  `Reconnecting...` messages as a session-recovery bug first.
- If the bridge sees `SESSION_EXPIRED`, replay the cached initialize request
  as a fresh session instead of preserving the old id.
- Use the cached initialize request as replay input only, never as a reason to
  keep a dead session alive.
