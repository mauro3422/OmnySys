# OmnySys Trust Model

## Purpose

OmnySys uses the codebase as the source of truth and the database as a trusted projection layer. The graph, metrics, watcher alerts, and runtime summaries are derived views that help explain and repair the source data.

## Source of Truth

- `atoms` are the canonical code-level source of truth.
- `files`, `system_files`, `call_graph`, `semantic_connections`, and risk tables are projections derived from `atoms` and file-system scans.
- The runtime should treat derived surfaces as trustworthy for reads only when the health checks report them as fresh and aligned.

## What Is Trusted

- `runtimeCodeFresh = true`
- `databaseHealth = A+`
- `watcherAlerts = 0`
- `metadataFieldCoveragePct = 100`
- `surfaceAudit.summary.trustworthy = true`

These signals mean the live runtime is safe to use for analysis, refactors, and repair operations.

## What Is Not Trusted

- Manual writes to derived tables
- Direct SQL against projection tables when a canonical API exists
- Heuristics that look like bugs but are only container shells, facades, or bootstrap wiring
- Live snapshots taken during daemon restart windows

## Repair Rules

- Repair drift by updating the canonical input layer first.
- Rebuild projections from canonical sources instead of patching tables by hand.
- Keep wrapper/facade files thin so the watcher can classify them accurately.
- Prefer one canonical API per projection path.

## Operational Policy

- Use the graph to understand impact before editing.
- Use watcher alerts as a signal, not as absolute truth.
- Use database health and surface audit as the acceptance gate for automated refactors.
- If a surface is stale, repair the canonical source and rehydrate the projection.

## Next Robustness Targets

- Reduce medium-risk coordination surfaces in `file-watcher`, `orchestrator`, and `unified-server`.
- Keep splitting large bootstrap facades into state helpers.
- Improve trust classification so facade/helper files are less likely to be flagged as bugs.
- Continue tightening metadata extraction coverage and live-row reconciliation.

