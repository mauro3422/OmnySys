# MCP Proxy Watchdog Double-Spawn Bug

## Summary

OmnySys could enter a restart/conflict loop when the HTTP proxy detected an already healthy daemon and chose to stay alive as a watchdog, but still fell through to the unconditional `spawnWorker()` path at the end of bootstrap.

This produced a second worker competing for the same port, which in turn amplified:

- delayed restart recovery
- `Transport closed` on the Codex side
- `Failed to open SSE stream: Conflict` in bridge telemetry
- crash/respawn cycles that looked like "double restart"

## Status

- **Local root cause identified:** yes
- **Code fix applied:** yes
- **Validated by unit tests:** yes
- **Requires proxy reload to validate live end-to-end:** yes

## Symptoms

- A restart seemed to trigger another restart "by itself"
- The daemon looked healthy, but another worker still tried to bind the same port
- Long waits around restart/reanalyze
- Bridge telemetry showed `Failed to open SSE stream: Conflict`
- Codex sometimes ended up with `Transport closed`
- Proxy telemetry accumulated `worker-crash` and `spawn-restart` events even when one daemon was already healthy

## Reproduction Pattern

1. Start OmnySys MCP proxy.
2. Leave a healthy daemon already owning port `9999`.
3. Start or reconnect another proxy/bootstrap path.
4. Proxy detects the healthy daemon and decides to monitor it.
5. Control flow still reaches the unconditional bootstrap `spawnWorker()`.
6. A second worker tries to bind the same port and enters retry/failure paths.

## Root Cause

The proxy startup logic had two incompatible decisions active at once:

- "A healthy daemon already exists, so this proxy should monitor it."
- "Finish bootstrap by spawning a worker."

That means the watchdog branch was logically correct, but the final bootstrap flow still executed the spawn path.

In `src/layer-c-memory/mcp-http-proxy.js`, the existing-daemon branch did not terminate bootstrap. So the process moved on to:

- `writeOwnerLock('starting')`
- `persistProxyTelemetry({ state: 'booting' })`
- `spawnWorker()`

This is why the system could look partially stable while still producing port conflicts and downstream bridge instability.

## Why It Looked Like a Reanalyze Bug

The user-visible pain often appeared during `reanalyze`, but that was not the only cause.

`reanalyze` increased the chance of hitting the problem because:

- startup and recovery windows were longer
- the bridge/client had to survive a larger reconnect window
- a duplicate worker caused extra bind retries and delayed readiness

So `reanalyze` amplified the bug, but the bug itself lived in proxy bootstrap/watchdog control flow.

## Evidence

### Telemetry pattern

Proxy telemetry showed repeated sequences of:

- `restart-requested`
- `worker-exit-planned-restart`
- `spawn-restart`
- later `worker-crash`

Bridge telemetry also showed:

- `Streamable HTTP error: Failed to open SSE stream: Conflict`

### Timing clue

The "mystery" worker failures often lined up with the bind retry budget in `src/layer-c-memory/mcp-http-listener.js`:

- initial bind wait on Windows: `2000ms`
- bind retry delay: `1500ms`
- retry limit in proxy mode: `15`

That produces a failure window of about `24.5s`, which matched the observed "worker lived for ~26s and then died" pattern closely enough to implicate port conflict/bind retry exhaustion instead of random analysis failure.

## Fix Applied

Added an explicit bootstrap decision helper:

- `src/layer-c-memory/mcp-http-proxy-bootstrap.js`

The proxy now resolves startup into one of three actions:

- `spawn`
- `monitor`
- `exit`

Applied that decision in:

- `src/layer-c-memory/mcp-http-proxy.js`

Behavior after the fix:

- healthy daemon + other proxy owner -> exit
- healthy daemon + no competing proxy owner -> monitor only
- no healthy daemon -> spawn worker

Most importantly: the monitor branch no longer falls through to the final `spawnWorker()`.

## Verification

- `node --check src/layer-c-memory/mcp-http-proxy.js`
- `node --check src/layer-c-memory/mcp-http-proxy-bootstrap.js`
- `npm run test:unit -- tests/unit/layer-c-memory/mcp-http-proxy-bootstrap.test.js tests/unit/layer-c-memory/mcp/stdio-bridge-startup.test.js tests/unit/layer-c-memory/mcp/stdio-bridge-helpers.test.js tests/unit/layer-c-memory/mcp/stdio-bridge-recovery.test.js tests/unit/layer-c-memory/mcp/stdio-bridge-telemetry.test.js tests/unit/layer-c-memory/mcp/cache-init-helpers.test.js`

Result at implementation time:

- `35/35` tests passed

## Evolution of the Investigation

### Phase 1: restart/reconnect bug

The first confirmed bug was the classic restart/reconnect failure:

- restart ACK interrupted active MCP transport
- bridge recovery was incomplete
- Codex ended in `Transport closed`

That bug is documented separately in:

- `docs/bugs/mcp-restart-reconnect.md`

### Phase 2: cold-start/session promotion bug

Then a second issue appeared:

- bridge cold start could bootstrap without a session
- later requests could collide with session establishment
- telemetry showed `Failed to open SSE stream: Conflict`

This led to:

- explicit sessionless bootstrap tracking
- promotion to a session-bound transport before normal requests

### Phase 3: proxy bootstrap/watchdog bug

After bridge recovery improved, the remaining instability pointed below the bridge:

- daemon often looked healthy
- yet restart/reconnect still felt noisy
- extra worker activity kept appearing

That exposed the real bootstrap/watchdog fallthrough bug documented here.

## External References

There **is** public evidence that `Transport closed` exists as a broader Codex/MCP class of issue, but not this exact OmnySys proxy bug.

### Official OpenAI docs

The official docs confirm Codex supports MCP over `streamable HTTP`, but they do **not** document this watchdog/double-spawn issue:

- https://developers.openai.com/codex/mcp

### Public Codex-side reports

- GitHub issue `openai/codex#7155` (published November 22, 2025): Windows MCP servers with heavy `stderr` can fail with `Transport closed`
- Dune MCP docs (crawled recently) mention a known Codex timeout/reconnect issue where long-running MCP calls can end in `Transport closed`

These reports matter because they show that `Transport closed` is not unique to OmnySys. However, they do **not** explain the OmnySys-specific duplicate worker / watchdog fallthrough bug.

## Conclusion

This bug is best classified as:

- **not** an officially documented OpenAI/Codex protocol rule
- **not** the same as the known Windows `stderr` or timeout-related `Transport closed` reports
- **yes**, a real OmnySys-local bootstrap bug that can trigger and amplify bridge instability

## Follow-up

After reloading the proxy process with this fix, re-run:

1. connect Codex MCP
2. `get_server_status`
3. `restart_server({ processRestart: true })`
4. wait `7s`
5. `get_server_status`
6. if desired, `restart_server({ clearCache: true, reanalyze: true })`

The remaining live validation goal is to confirm that the proxy stays in `monitoring` mode instead of spawning a second worker when a healthy daemon already exists.
