# System Stability and Metrics Unification Plan

**Status**: Active maintenance plan  
**Audience**: lower-level AI agents and maintainers  
**Last verified**: 2026-03-30

## Purpose

This plan turns the current reconnect fix and system-health investigation into a
phased execution backlog. The goal is not only to keep OmnySys running, but to
make its health, debt, and readiness surfaces consistent enough that a future
agent can trust what it reads without over-interpreting one optimistic score.

## Current Reality

What is already strong:

- MCP tool routing is working again end-to-end from Codex/VS Code to OmnySys.
- The canonical database schema is healthy and synchronized with the registry.
- Pipeline integrity is passing at `100 / A+`.
- Runtime/session state is healthy enough to serve tools for multiple clients.

What is not yet unified:

- Some surfaces report `A+` operational health while readiness remains
  `blocked`.
- Architectural debt, naming debt, and folderization debt are large enough to
  drag trust down even when the daemon is stable.
- Some metric surfaces use derived or narrative labels that do not match the
  raw SQLite table names directly.
- Metadata coverage is good overall, but some semantic payloads remain empty and
  limit how much downstream analytics should be trusted.

## Trust Hierarchy

Use this order when judging the system:

1. `get_server_status`
2. `check_pipeline_integrity`
3. `get_schema(type: "database")`
4. `execute_sql`
5. `get_metrics_snapshot` and `get_health_snapshot`
6. `get_technical_debt_report`
7. one-line boot summaries and ad-hoc terminal summaries

Interpretation:

- Layers `1-4` are canonical enough to decide whether the system is healthy.
- Layers `5-6` are valuable, but they are governance/readiness surfaces and can
  be stricter or noisier than runtime truth.
- Layer `7` is convenience telemetry, not the final source of truth.

## Guardrails For Any Agent

- Do not declare the system healthy or broken from a single score.
- Always cross-check at least one dashboard surface against schema or SQL.
- Prefer raw SQLite table names over guessed names.
- If a tool summary and SQL disagree, treat SQL and schema as authoritative
  until the mismatch is explained.
- After every code or doc change, run `get_recent_errors()` and record any new
  watcher signal.

## Phase 0 - Freeze the Baseline

### Goal

Capture a stable before-state so future work can prove improvement instead of
moving targets.

### Required tools

- `get_server_status`
- `check_pipeline_integrity`
- `get_schema(type: "database")`
- `get_health_snapshot`
- `get_technical_debt_report`
- `execute_sql`

### Tasks

1. Save the current values for:
   - runtime health
   - client sync
   - database health
   - integrity grade
   - naming debt
   - folderization debt
   - active watcher alerts
2. Run SQL sanity queries for:
   - active atoms
   - active files
   - active system files
   - active call relations
   - active semantic connections
   - orphan atoms
   - orphan call relations
   - orphan risk rows
3. Record any mismatch between dashboards and SQL in this file or a linked note.

### Exit criteria

- A maintainer can point to one baseline snapshot and one SQL-backed baseline.

## Phase 1 - Unify Metric Semantics

### Goal

Make every major metric traceable to one canonical source.

### Required tools

- `get_schema(type: "database", includeSQL: true)`
- `get_tool_inventory_report`
- `execute_sql`

### Tasks

1. Build a mapping table from metric name to:
   - owning tool surface
   - raw table or view
   - exact SQL semantics
   - caveats
2. Pay special attention to:
   - `healthScore`
   - `successScore`
   - `driftScore`
   - `stabilityScore`
   - `namingDebt`
   - `folderizationCandidateCount`
   - `clientSyncState`
   - `riskRows`
3. Remove or rename any narrative metric labels that look raw but are actually
   derived.
4. Add a maintenance note whenever a dashboard label does not directly match a
   table name.

### Exit criteria

- A future agent can explain each major metric without guessing table names or
  semantics.

## Phase 2 - Keep Reconnect Stable Under Change

### Goal

Make the reconnect fix survive hot-reload, worker restart, and stale client
state.

### Required tools

- `get_server_status`
- `get_recent_errors`
- `validate_imports`
- runtime tests already covering session routing

### Tasks

1. Keep the Streamable HTTP compatibility shim covered by tests.
2. Re-test after real worker reloads, not only cache clears.
3. Preserve these invariants:
   - `enableJsonResponse: true`
   - Accept normalization before transport dispatch
   - Node request normalization includes `rawHeaders`
   - shared resumable event store
   - fresh-session recovery on stale or expired transport state
   - duplicate-session pruning on save
4. If the bug returns, inspect:
   - `mcp-http-session-routing.js`
   - `stdio-bridge-recovery.js`
   - `session-manager.js`
   - Codex/VS Code connector state

### Exit criteria

- Tool calls survive IDE restart, worker restart, and a reconnect cycle without
  falling back to a broken `Reconnecting...` loop.

## Phase 3 - Close the Data Credibility Gap

### Goal

Reduce the gap between operational health and dashboard trust.

### Required tools

- `get_health_snapshot`
- `get_metrics_snapshot`
- `get_health_panel`
- `execute_sql`

### Tasks

1. Explain why `healthScore` can be `A+` while `successScore` remains below the
   threshold.
2. Separate operational metrics from governance/readiness metrics in docs and
   output surfaces.
3. Stop presenting a single optimistic summary without its limiting factors.
4. Add explicit provenance fields where missing:
   - raw table backed
   - derived score
   - policy threshold
   - confidence

### Exit criteria

- A reader can tell whether a metric means runtime health, DB integrity, or
  architecture/readiness debt.

## Phase 4 - Fill High-Value Metadata Gaps

### Goal

Increase trust in downstream semantic analytics.

### Required tools

- `get_schema(type: "atoms")`
- `aggregate_metrics(aggregationType: "patterns")`
- `aggregate_metrics(aggregationType: "async_analysis")`
- `aggregate_metrics(aggregationType: "risk")`

### Tasks

1. Prioritize empty or weak fields:
   - `atoms.data_flow_json`
   - `atoms.dna_json`
   - `atoms.error_flow_json`
2. Decide which fields should be:
   - fully populated
   - intentionally optional
   - explicitly marked unsupported
3. Add coverage metrics that distinguish:
   - unavailable by design
   - not yet implemented
   - extraction failed

### Exit criteria

- Metadata coverage can be trusted without pretending empty fields are complete.

## Phase 5 - Pay Down Structural Debt

### Goal

Lower the debt that currently keeps readiness and maintainability blocked.

### Required tools

- `get_technical_debt_report`
- `get_folderization_snapshot`
- `rename_folderized_family`
- `folderize_family`
- `suggest_refactoring`

### Tasks

1. Attack naming debt first, because it is large and system-wide.
2. Normalize already-folderized families before creating more.
3. Reduce flat families and naming targets in batches.
4. Split or simplify the largest MCP/session files that keep appearing in
   watcher alerts.

### Exit criteria

- Naming debt, flat families, and watcher governance warnings trend down across
  consecutive snapshots.

## Phase 6 - Simplify the MCP Surface

### Goal

Make the tool catalog easier to reason about and safer for agents.

### Required tools

- `list_tools`
- `get_tool_inventory_report`
- `validate_imports`

### Tasks

1. Split the tool inventory mentally and then structurally into:
   - query
   - mutation
   - validation
   - diagnostics
   - maintenance
2. Keep tool names aligned with their real source of truth.
3. Avoid adding more wrappers that only rename existing behavior.

### Exit criteria

- The tool inventory is easier to navigate and metrics use the same vocabulary
  as the runtime/catalog.

## Phase 7 - Build a Credible Executive Summary

### Goal

Expose one summary that is hard to misread.

### Required tools

- `get_server_status`
- `get_health_snapshot`
- `check_pipeline_integrity`
- `execute_sql`

### Tasks

1. Present at least four separate status bands:
   - runtime
   - database
   - pipeline
   - architecture/readiness
2. Show confidence and provenance for each band.
3. Avoid a single score unless the subscores are visible next to it.

### Exit criteria

- A maintainer can answer “is OmnySys healthy?” without collapsing runtime,
  database, and debt into one misleading number.

## Immediate Next Moves

Do these before starting broad refactors:

1. Add a metric-to-table dictionary for the most visible status/debt fields.
2. Clean up the highest-value naming/folderization debt clusters.
3. Split `mcp-http-session-routing.js` and `session-manager-methods.js` enough
   to reduce watcher governance warnings.
4. Revisit metadata extraction coverage for empty semantic fields.

## What Success Looks Like

The system does not need to become “perfectly clean” to be credible. It needs
to become consistently interpretable:

- runtime healthy
- database trustworthy
- metrics traceable
- debt visible without distorting runtime truth
- reconnect behavior stable under restart and hot-reload
