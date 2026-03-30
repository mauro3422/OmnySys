# Daemon Restart and Concurrency Policy

**Status**: Draft temporal  
**Scope**: daemon supervisor, client reconnect, runtime freshness, SQLite writes  
**Last verified**: 2026-03-23

This policy defines how the shared OmnySys daemon should behave when multiple
clients are connected and runtime code changes arrive.

The goal is simple:

- keep the daemon alive
- avoid manual restarts whenever possible
- allow many clients to read and query at the same time
- serialize only the operations that can corrupt state
- make freshness signals advisory when the runtime is still recoverable

## Core Principle

OmnySys is a single shared daemon with many adapters.

Clients may connect through HTTP direct or through the stdio bridge, but the
canonical runtime state lives in the daemon and its SQLite store.

The daemon is allowed to restart the worker, reindex data, or flush cache.
Clients should not need to know which internal step happened unless recovery
fails.

## What Can Run In Parallel

These operations are generally safe to overlap:

- health checks
- tool registry reads
- status reads
- session lookup
- client reconnect attempts
- bridge handshake replay
- read-only graph queries
- read-only DB inspection

These are read-dominant or bounded recovery operations.

## What Must Be Serialized

These operations should be coordinated by the daemon supervisor:

- SQLite writes
- bulk reindex
- schema migration
- runtime restart
- cache clear + reindex
- background analysis startup
- worker respawn
- session re-adoption after reconnect

If two clients request the same expensive operation, the supervisor should
collapse them into one in-flight action when possible.

## Restart Classes

### 1. No Restart

Use when the change is outside the live runtime:

- docs
- tests
- workspace configuration
- client configuration files
- backlog notes
- non-runtime metadata

### 2. Reload or Reindex Only

Use when the runtime code is still valid, but the in-memory state or cached
analysis must be refreshed:

- file-level analysis updates
- cache invalidation
- live-row reconciliation
- metadata refresh
- batch processor refresh

### 3. Worker Restart

Use when runtime-facing code changed and the daemon needs a fresh ESM cache:

- MCP worker files
- bridge-facing runtime modules
- session manager behavior
- hot-reload manager handlers
- restart tool plumbing

The proxy should stay alive while the worker restarts.

### 4. Full Daemon Restart

Use only when the parent supervisor itself must be replaced or the runtime
cannot safely recover:

- proxy-level lifecycle failures
- port ownership corruption
- unrecoverable worker crash loop
- severe state desynchronization that cannot be repaired in place

## Freshness Signals

The system should distinguish between:

- `stale`: the runtime or data needs reconciliation
- `restartRequired`: the worker must be reloaded to pick up code changes
- `degraded`: the daemon is alive but not fully trustworthy yet
- `broken`: recovery is not currently possible without intervention

These states are not equivalent.

## Client Behavior

Clients should behave as follows:

- HTTP clients keep their connection to the daemon URL and retry on worker
  replacement.
- stdio bridge clients may auto-start the daemon if it is missing.
- bridge clients should replay the cached initialize handshake after restart.
- sessions should be re-adopted by `client_id` when possible.
- if a request is interrupted by restart, return a retryable error instead of
  silently hanging.

## SQLite Guidance

SQLite is the shared persistence layer, so the daemon should treat writes as
critical sections.

Rules:

- do not start multiple heavy write paths at once
- avoid reindex loops that overlap with live writes
- batch writes when possible
- prefer one authoritative writer for the same logical action
- when in doubt, defer non-essential repairs until the active write phase
  finishes

## Recommended Supervisor Behavior

The future daemon supervisor should:

1. Observe file changes.
2. Classify them as docs, data-only, reloadable runtime, or restart-required.
3. Coalesce multiple changes into one action window.
4. Restart only the worker when the parent daemon can stay alive.
5. Replay client sessions after restart.
6. Surface the result as advisory state to clients.

## Practical Meaning

This policy is what makes the desired model viable:

- many clients can read the same daemon at once
- one client can reconnect while another continues working
- the daemon can recover without manual intervention
- the system can remain stable even while code changes are being applied

The only hard limit is uncontrolled concurrent writes and uncontrolled restarts.
Those must stay behind the supervisor.

## Reconnect Bug Guardrails

The Codex VS Code reconnect bug is not only a session problem. During
hot-reload, reindex, or worker replacement, the client can come back with a
stale session and a degraded HTTP handshake at the same time.

Supervisor policy must assume both classes of drift:

- session reuse drift
- HTTP transport compatibility drift

Current server safeguards:

- shared `eventStore` across HTTP transport instances
- fresh-session recovery when replaying bridge initialization
- active-session deduplication by `client_id`
- JSON `POST` responses via `enableJsonResponse: true`
- `Accept` header normalization before requests reach the MCP SDK transport

Restart implication:

- keeping the proxy alive is still the right model
- but a healthy worker restart is not enough if the connector re-enters with a
  partially degraded handshake
- the supervisor should preserve the compatibility shim across restart classes
  2 and 3, not only during cold boot
- `clearCacheOnly` should not be treated as sufficient validation for HTTP
  transport/router changes; those require a real worker reload before the live
  endpoint behavior is considered updated
