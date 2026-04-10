# MCP WSL Route Dedup `Transport closed`

## Date

2026-04-09

## Summary

When Codex ran from WSL against the Windows OmnySys daemon, the MCP backend could remain healthy while a single Codex chat kept failing with:

- `tool call error: ... Transport closed`
- `failed to get client`
- `initialize response` / handshake failures

At the same time, another agent connected to the same daemon could continue using tools normally.

This was not a pure daemon failure. It was a launcher-route identity problem in the WSL bridge path.

## Observed Pattern

1. Windows daemon stayed healthy on `127.0.0.1:9999`.
2. A WSL Codex session showed `Transport closed`.
3. Another agent or launcher route could still use OmnySys tools successfully.
4. OmnySys logs still showed active sessions like `client: codex` or `client: codex-shell`.
5. Reconnect attempts did not always stabilize the failing WSL launcher.

## Why This Was Confusing

The system already had robust bridge recovery for:

- daemon restart
- stale MCP sessions
- proxy watchdog conflicts

So the failure looked at first like a regression of the old reconnect bugs. But the backend was healthy and the bridge recovery code was already present.

The key clue was this:

- one launcher route failed
- another launcher route worked at the same time

That pointed away from the daemon and toward launcher identity / dedup semantics.

## Root Cause

The WSL wrapper-backed OmnySys MCP config reused the canonical client identity:

- `OMNYSYS_CLIENT_ID = "codex"`
- `OMNYSYS_CLIENT_NAME = "codex"`

The stdio bridge does support route-aware dedup via `client_route_id`, and the session manager explicitly prefers:

1. `client_route_id`
2. `original_client_route_id`
3. `client_id`

However, the WSL launcher path did not stamp an explicit stable route base of its own.

That meant concurrent Codex launchers could still look too similar from the daemon's point of view, especially when multiple Codex-side sessions existed and the route identity depended on ambient process context instead of explicit launcher intent.

## Fix Applied

### 1. WSL bridge launcher now stamps an explicit route id

File:

- `scripts/mcp/omnysystem-wsl-bridge.sh`

Behavior:

- preserves `OMNYSYS_CLIENT_ID`
- preserves `OMNYSYS_CLIENT_NAME`
- adds `OMNYSYS_CLIENT_ROUTE_ID` when absent
- builds it from:
  - `OMNYSYS_CLIENT_ROUTE_BASE`
  - `WSL_DISTRO_NAME`
  - shell pid

Result:

- concurrent WSL launcher processes get isolated route buckets
- daemon dedup stays route-aware instead of collapsing multiple Codex launchers together

### 2. WSL sync now writes an explicit route base

Files:

- `src/cli/utils/mcp-standardizer/wsl-codex-sync-helpers.js`
- `src/cli/utils/mcp-standardizer/wsl-codex-sync.js`

Behavior:

- WSL wrapper config now includes:
  - `OMNYSYS_CLIENT_ROUTE_BASE = "codex-wsl"`
- existing wrapper-backed configs are refreshed if they predate this field
- explicit custom route bases are preserved

## Verification

- `bash -n scripts/mcp/omnysystem-wsl-bridge.sh`
- `node --check src/cli/utils/mcp-standardizer/wsl-codex-sync.js`
- `node --check src/cli/utils/mcp-standardizer/wsl-codex-sync-helpers.js`
- `npx vitest run tests/unit/cli/utils/mcp-standardizer/wsl-codex-sync.test.js`

At implementation time:

- `5/5` tests passed

## Lessons Learned

### 1. Healthy daemon does not mean healthy launcher route

If one agent works and another does not, do not blame the daemon first.

Separate:

- daemon health
- bridge recovery
- MCP registry/config
- launcher route identity
- active session dedup

### 2. `Transport closed` is a symptom class, not a single bug

In OmnySys it has already appeared from different layers:

- restart/reconnect interruption
- proxy watchdog double-spawn
- WSL launcher route collision

So `Transport closed` should trigger classification, not assumption.

### 3. Route-aware identity is safer than client-wide identity

`client_id = codex` is too coarse when several Codex launchers or surfaces coexist.

Prefer:

- stable per-launcher route base
- unique per-process route id

while preserving the canonical client family (`codex`, `qwen-code`, etc.).

## Pattern To Reuse

For future launcher bridges:

1. Keep canonical `client_id` for family-level telemetry.
2. Add an explicit launcher-scoped route base.
3. Derive a per-process `client_route_id`.
4. Make config sync able to refresh older launcher configs missing the route metadata.

## Follow-up

After this fix is deployed, the remaining validation step is live:

1. restart / reload the Codex WSL session
2. let it mount the updated wrapper config
3. call `mcp_omnysystem_list_tools`
4. call `mcp_omnysystem_get_health_panel`

If `Transport closed` still appears after the route fix, the next debugging pass should capture bridge trace events around:

- initialize send
- initialize response
- session adoption
- first post-initialize tool call

That would tell us whether Codex closes the transport before or after the daemon binds the route-aware session.
