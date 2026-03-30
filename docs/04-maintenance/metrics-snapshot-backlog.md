# Metrics Snapshot Backlog

Status: open

## Goal

Build a canonical metrics snapshot layer that stores the system health picture over time, compares the current state with prior states, and reports velocity of improvement or regression.

## Observed Needs

- The current status/dashboard surfaces show point-in-time health, but they do not yet expose a historical progress line by default.
- Snapshot data should be persisted in SQLite so the system can compare the current run against the previous run and against a baseline window such as three days ago.
- The snapshot should be scope-aware, so `scopePath` and `focusPath` can drive local comparisons instead of only global repo-wide summaries.
- The snapshot should combine health, duplicates, folderization, naming debt, file coverage, graph coverage, watcher noise, and recent error counts.
- The snapshot should be able to show whether the MCP/runtime actually improved after a fix, not just whether a single check passed.
- Tool executions should be measured as causal repair events, so the system can track how often a watcher alert or runtime error was followed by a successful tool run that improved the snapshot.
- The snapshot should expose a success threshold and a behavioral readiness score so the project can answer "is the MVP healthy enough?" instead of only "is it healthy today?".
- A compact health dashboard should sit on top of the snapshot so one call can show current health, trend, tool success, top regressors, and MVP readiness.

## Metrics To Persist

- `healthScore` and `healthGrade`
- `issueCount`, `recentErrorCount`, `recentWarningCount`
- `structuralGroups`, `conceptualGroups`, `conceptualRawGroups`
- `pipelineOrphans`
- `folderizationCandidateCount`, `flatFamilies`, `mixedFamilies`, `alreadyFolderizedFamilies`
- `namingFamilies`, `namingTargets`, `namingDebt`
- `liveCoverageRatio`, `zeroAtomFileCount`
- `callLinks`, `semanticLinks`
- `watcherAlertCount`
- `phase2PendingFiles`
- `analysisGenerationId`
- `driftState`, `driftScore`, `stabilityScore`, `successScore`, `successThreshold`, `mvpReady`
- `behaviorState`, `readinessReason`
- Tool-run telemetry: `totalRuns`, `repairedRuns`, `thrashingRuns`, `toolSuccessRate`, `repairYield`, `alertClearanceRate`, `errorClearanceRate`, `averageDurationMs`

## Follow-Up Work

- Add a retention policy so old snapshots do not grow forever in SQLite.
- Add a lightweight timeline query that returns the last N snapshots plus a three-day baseline comparison.
- Add dashboard formatting that highlights trend direction and velocity, not only current health.
- Add a compact health dashboard tool that returns the current state, regressions, improvements, repair telemetry, and readiness in one call.
- Add a one-screen health panel tool that compresses the dashboard into status now, trend, top regressions, top improvements, and next action.
- Add a dedicated snapshot diff view for folderization, naming debt, duplicate pressure, and error resolution.
- Make the snapshot tool support exporting a compact chart-friendly payload for external reporting.
- Persist causal tool-run telemetry so watcher alerts, errors, and fixes can be scored as a repair cycle instead of inferred only from point-in-time snapshots.
- Add an MVP readiness dashboard that explains why the system is or is not above the success threshold.

## Working Notes

- Treat the snapshot table as an append-only history of health states.
- Use the DB as the source of truth for historical comparisons.
- Prefer compact, reusable summary fields alongside a raw JSON payload.
- Keep `scopePath` and `focusPath` normalized before writing or querying snapshots.
- Use `mcp_tool_runs` as the source of truth for tool success/failure/repair metrics.
