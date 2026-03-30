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

## Follow-Up Work

- Add a retention policy so old snapshots do not grow forever in SQLite.
- Add a lightweight timeline query that returns the last N snapshots plus a three-day baseline comparison.
- Add dashboard formatting that highlights trend direction and velocity, not only current health.
- Add a dedicated snapshot diff view for folderization, naming debt, duplicate pressure, and error resolution.
- Make the snapshot tool support exporting a compact chart-friendly payload for external reporting.

## Working Notes

- Treat the snapshot table as an append-only history of health states.
- Use the DB as the source of truth for historical comparisons.
- Prefer compact, reusable summary fields alongside a raw JSON payload.
- Keep `scopePath` and `focusPath` normalized before writing or querying snapshots.
