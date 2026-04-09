# MCP Worker Periodic Exit After Ready

## Date

2026-04-09

## Summary

After the MCP HTTP proxy/bridge stabilization work, the daemon can now boot and serve MCP requests again, but a separate worker bug remains: some workers still exit with `code=1` after startup without leaving a useful fatal trace.

## Observed Pattern

1. Proxy starts and spawns `mcp-http-server.js`.
2. Worker reaches `orchestrator-init` or even completes `ready`.
3. After roughly 30-40 seconds, the worker exits with `code=1`.
4. Proxy crash handler respawns a new worker.
5. A later worker may stay alive, but the extra recycle adds latency and makes restart flows noisy.

## Evidence

- Proxy logs show repeated:
  - `Worker exited (code=1, signal=null)`
  - `Worker crashed (code=1). Respawning in 5s...`
- The timing often overlaps with watcher lifecycle activity and the first `ORPHAN CHECK` window.
- `logs/mcp-worker-crash-trace.log` currently captures:
  - explicit boot-failure traces from tests
  - boot-timeout traces
  - but not yet a definitive runtime root cause for the periodic `code=1` exits

## Current Hypotheses

1. A runtime task scheduled shortly after startup is still calling or propagating a fatal exit path.
2. Some crashes may happen in a path that bypasses the current fatal tracing or occurs in a child/runtime boundary that is not yet annotated enough.
3. The issue is separate from the earlier proxy double-spawn bug and separate from the earlier bridge `Transport closed` recovery bug.

## What Was Improved

- Proxy bootstrap/watchdog no longer treats a merely booting daemon as dead.
- Worker crash traces now include:
  - `currentStep`
  - `currentDetail`
  - `initError`
- Initialization subphases are now annotated for:
  - `orchestrator-init`
  - `ready-step`

## Remaining Gap

The periodic `code=1` exit still needs one more debugging pass to identify the exact caller or exception site. The next useful step is to widen tracing around post-startup periodic jobs and any remaining `process.exit(1)` runtime paths loaded by the HTTP daemon.
