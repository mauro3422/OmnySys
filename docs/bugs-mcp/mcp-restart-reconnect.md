# MCP Restart Reconnect Bug

## Summary

`mcp_omnysystem_restart_server({ processRestart: true })` used to interrupt the in-flight MCP transport and leave Codex / VS Code with a stale session.

The bridge now acknowledges the restart locally, schedules recovery asynchronously, and replays the cached `initialize` flow after the daemon comes back.

## Symptoms

- `tool call error: ... DAEMON_RESTARTING: in-flight request was interrupted`
- `tool call error: ... Transport closed`
- `Bad Request: Server not initialized`
- `fetch failed` during restart forward
- Recovery crash with `log is not a function`

## Reproduction Pattern

1. Start the OmnySys MCP proxy.
2. Call `mcp_omnysystem_list_tools`.
3. Call `mcp_omnysystem_get_server_status`.
4. Call `mcp_omnysystem_restart_server({ processRestart: true })`.
5. Wait for the daemon to respawn.
6. Call `mcp_omnysystem_list_tools` again.

## Root Cause

Two separate problems combined:

- The restart tool call was forwarded in a way that interrupted the active transport before the client saw a valid MCP response.
- The recovery path could crash because `waitForDaemonHealthy()` was called without a safe logger callback.

The bridge also needed to preserve the restart tool result shape expected by Codex:

- `jsonrpc: "2.0"`
- `result.structuredContent`
- `result.content`

## Fixes Applied

- Added a local ACK for restart tool calls before the daemon is torn down.
- Scheduled bridge recovery asynchronously after the ACK.
- Replayed the cached `initialize` request after daemon recovery.
- Added trace markers for:
  - restart request received
  - local ACK sent
  - restart forwarded
  - recovery scheduled
  - transport create / close / error
- Made `waitForDaemonHealthy()` safe when `log` is not provided.
- Reused the canonical `waitMs` helper instead of keeping duplicate copies.
- The restart ACK now includes an estimated ready window plus suggested retry methods.

## Verification

- `npm run check`
- `npx vitest run tests/unit/layer-c-memory/mcp/stdio-bridge-helpers.test.js`
- `npx vitest run tests/unit/layer-c-memory/mcp/stdio-bridge-recovery.test.js`
- `npx vitest run tests/unit/layer-c-memory/mcp/stdio-bridge-health.test.js`

## References

- [OpenAI Codex MCP](https://developers.openai.com/codex/mcp)
- [OpenAI Codex config reference](https://developers.openai.com/codex/config-reference)
- [Running Codex as an MCP server](https://developers.openai.com/codex/guides/agents-sdk#running-codex-as-an-mcp-server)
- [OpenAI MCP docs](https://platform.openai.com/docs/docs-mcp)

## Notes

- The restart/recovery path is now traceable through `bridge-trace:*` events.
- The remaining watcher warnings are technical debt, not a functional blocker.
- If the restart path regresses, check the trace event sequence before changing the daemon itself.
- `Transport closed` later reappeared through a different WSL launcher-route collision pattern; that evolution is documented in `docs/bugs-mcp/mcp-wsl-route-dedup-transport-closed.md`.
- A later local investigation also documented a distinct VS Code launcher freeze when Codex was configured to start through WSL; that issue is tracked separately in `docs/bugs-mcp/vscode-codex-wsl-startup-freeze.md`.
- A healthy `/health` snapshot does not imply an active MCP session. The session counter only moves after a full MCP `initialize` handshake succeeds.
- A direct Windows SDK probe on 2026-04-10 confirmed that the transport/session handshake is what creates the live session, not the daemon boot alone.
