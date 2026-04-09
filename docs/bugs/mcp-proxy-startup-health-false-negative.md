# MCP Proxy Startup Health False Negative

## Symptom

During daemon bootstrap, `/health` reports `status: "starting"` until `ready-step` finishes.
Any secondary proxy/watchdog that treats only `status: "healthy"` as live can misclassify a booting daemon as dead and make duplicate ownership or respawn decisions.

This amplified restart noise around:

- bootstrap snapshots
- long `ready-step` dashboard generation
- bridge reconnect windows

## Local Root Cause

`detectHealthyDaemon()` only returned `healthy: true` when `/health` returned `status === "healthy"`.

That was too strict for proxy ownership and duplicate suppression, because a daemon can be:

- alive
- same-project
- bound on port 9999
- still finishing `ready-step`

without being `healthy` yet.

## Fix

- Added `alive` semantics to `detectHealthyDaemon()`
- Proxy bootstrap/start-lock/monitoring paths now treat `alive` as sufficient to avoid duplicate spawning
- Worker crash traces now include `currentInitializationDetail`
- `ready-step` and `orchestrator-init-step` now publish finer-grained detail markers

## Status

Fixed in code. Requires proxy restart to validate in live runtime.
