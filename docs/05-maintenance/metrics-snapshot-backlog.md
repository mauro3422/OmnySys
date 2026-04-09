# Metrics Snapshot Backlog

Status: open

## Goal

Build a canonical metrics snapshot layer that stores the system health picture over time, compares the current state with prior states, and reports velocity of improvement or regression.

## Observed Needs

- The current status/dashboard surfaces show point-in-time health, but they do not yet expose a historical progress line by default.
- Snapshot data should be persisted in SQLite so the system can compare the current run against the previous run and against a baseline window such as three days ago.
- The snapshot should be scope-aware, so `scopePath` and `focusPath` can drive local comparisons instead of only global repo-wide summaries.
- The folderization subsystem should also have a lightweight, DB-backed snapshot API so naming/folder guidance can be queried without invoking the full compiler health pipeline.
- The snapshot should combine health, duplicates, folderization, naming debt, file coverage, graph coverage, watcher noise, and recent error counts.
- The snapshot should also carry the active atom count and historical pipeline phase timings so the system can spot data drift and ms regressions as part of health.
- The snapshot should be able to show whether the MCP/runtime actually improved after a fix, not just whether a single check passed.
- The snapshot should distinguish daemon health from client/session drift so reconnect loops can be diagnosed without guessing.
- Tool executions should be measured as causal repair events, so the system can track how often a watcher alert or runtime error was followed by a successful tool run that improved the snapshot.
- The snapshot should expose a success threshold and a behavioral readiness score so the project can answer "is the MVP healthy enough?" instead of only "is it healthy today?".
- A compact health dashboard should sit on top of the snapshot so one call can show current health, trend, tool success, top regressors, and MVP readiness.
- Folderization automation should surface as a first-class snapshot signal so we can track when a folderization move is merely planned versus safe to execute.
- The remaining duplicate builder cluster around dashboard/snapshot assembly should be tracked as a high-value debt item because it keeps control-plane summaries wide even after contract resolution has been centralized.

## Metrics To Persist

- `healthScore` and `healthGrade`
- `issueCount`, `recentErrorCount`, `recentWarningCount`
- `structuralGroups`, `conceptualGroups`, `conceptualRawGroups`
- `pipelineOrphans`
- `folderizationCandidateCount`, `flatFamilies`, `mixedFamilies`, `alreadyFolderizedFamilies`
- `namingFamilies`, `namingTargets`, `namingDebt`
- `liveCoverageRatio`, `zeroAtomFileCount`
- `activeAtoms`
- `callLinks`, `semanticLinks`
- `watcherAlertCount`
- `phase2PendingFiles`
- `analysisGenerationId`
- `driftState`, `driftScore`, `stabilityScore`, `successScore`, `successThreshold`, `mvpReady`
- `behaviorState`, `readinessReason`
- Pipeline timing telemetry: `totalDurationMs`, `averagePhaseMs`, `slowPhaseCount`, `maxPhaseName`, `performanceState`
- Phase 2 execution telemetry: `phase2TotalMs`, `phase2ThroughputItemsPerSec`, `phase2BacklogRemaining`, `phase2ParseFailureCount`, `phase2ParseFailureRate`
- Tool-run telemetry: `totalRuns`, `repairedRuns`, `thrashingRuns`, `toolSuccessRate`, `repairYield`, `alertClearanceRate`, `errorClearanceRate`, `averageDurationMs`
- MCP session/reconnect telemetry: `clientSyncState`, `clientSyncReason`, `transportReconnectAttempts`, `sessionRecoverySuccessRate`, `freshSessionResets`, `duplicateClientBuckets`
- HTTP compatibility telemetry: `normalizedAcceptRequests`, `jsonPostResponses`, `compatHandshakeRepairs`, `compat406AvoidedCount`
- Database drift telemetry: `dbSyncState`, `dbBusyCount`, `reconciliationCount`, `reconciliationStaleRows`, `calledByResolutionRate`, `orphanReconciliationDelta`

## Follow-Up Work

- Add a retention policy so old snapshots do not grow forever in SQLite.
- Add a lightweight timeline query that returns the last N snapshots plus a three-day baseline comparison.
- Add dashboard formatting that highlights trend direction and velocity, not only current health.
- Add a compact health dashboard tool that returns the current state, regressions, improvements, repair telemetry, and readiness in one call.
- Add a one-screen health panel tool that compresses the dashboard into status now, trend, top regressions, top improvements, and next action.
- Add a dedicated folderization snapshot tool that returns DB-backed guidance, naming debt, sync drift, and role stems without loading the full health snapshot.
- Persist the folderization snapshot history as a DB-backed series so naming and folder-order advance can be tracked over time independently of health.
- Surface the compact health panel in the bootstrap terminal summary so the startup log shows a single readable health line without oversaturating the output.
- Add a dedicated snapshot diff view for folderization, naming debt, duplicate pressure, and error resolution.
- Make the snapshot tool support exporting a compact chart-friendly payload for external reporting.
- Persist causal tool-run telemetry so watcher alerts, errors, and fixes can be scored as a repair cycle instead of inferred only from point-in-time snapshots.
- Persist pipeline phase timing telemetry so startup and reindex ms regressions can be scored and alerted like any other health drift.
- Persist reconnect and session-drift telemetry so the system can tell the difference between a dead daemon, a stale client cache, and a loop triggered by session reuse.
- Persist compatibility-shim telemetry so the system can tell when a reconnect was saved by request normalization instead of assuming the client was healthy.
- Add a direct metric for `extractDataFlow` parse failures so malformed test/factory snippets stop being invisible performance debt.
- Add an MVP readiness dashboard that explains why the system is or is not above the success threshold.
- Add a compact `folderizationAutomation` trend line so future snapshots can answer whether automation confidence is rising, blocked, or still review-only.

## Working Notes

- Treat the snapshot table as an append-only history of health states.
- Use the DB as the source of truth for historical comparisons.
- Prefer compact, reusable summary fields alongside a raw JSON payload.
- Keep `scopePath` and `focusPath` normalized before writing or querying snapshots.
- Use `mcp_tool_runs` as the source of truth for tool success/failure/repair metrics.

## Reconnect Bug Note

As of 2026-03-30 the reconnect investigation showed that daemon health can stay
green while the Codex/VS Code connector still drifts on the HTTP handshake.
Metrics must therefore separate:

- session recovery quality
- connector compatibility repairs
- true daemon availability

If those three signals are collapsed into one "healthy/unhealthy" bit, the
system hides the exact bug class we have been chasing.
