<!-- OMNYSYS MCP TOOLS REFERENCE — Auto-injected by OmnySys installer -->

## OmnySys MCP Tools — Reference Guide

> **Golden Rule:** Before creating → verify it doesn't exist. Before editing → check impact. After editing → check for errors.

### Standard Workflow

```js
// Step 1: See available tools
list_tools({ includeSchemas: false })

// Step 2: Before creating — check if it exists
query_graph({ queryType: "instances", symbolName: "myFunction" })

// Step 3: Before editing — check what breaks
traverse_graph({ traverseType: "impact_map", filePath: "src/file.js" })

// Step 4: After editing — verify nothing broke
get_recent_errors()
// Note: errors are auto-injected in _recentErrors on ANY tool response
```

---

### Query Tools — Inspect Code

| Tool | When to Use | Required Params |
|------|-------------|----------------|
| **`query_graph`** | Inspect a symbol: `instances` (find), `details` (full metadata), `history` (Git commits) | `queryType` |
| **`traverse_graph`** | Navigate dependencies: `impact_map` (what breaks), `call_graph` (who calls whom) | `traverseType`, `filePath` |
| **`impact_atomic`** | Simulate impact before modifying: `intent: "usage"`, `"deletion"`, `"signature_change"` | `symbolName` |
| **`get_atom_history`** | Git history of a symbol — who changed what and when | `symbolName`, `filePath` |
| **`get_atom_evolution_report`** | Full report: details + DNA + dataFlow + impact + Git + archive + schema | `symbolName`, `filePath` |
| **`aggregate_metrics`** | Grouped metrics — see table below | `aggregationType` |

#### `aggregate_metrics` — Available aggregationType values

| Type | Returns |
|------|---------|
| `health` | Average fragility, coupling, cohesion across the project |
| `risk` | Files by risk level (Critical/High/Medium/Low) |
| `duplicates` | Structural clones by DNA fingerprint |
| `isomorphism` | Isomorphic duplicate detection |
| `conceptual_duplicates` | Semantic duplicates (same purpose, different implementation) |
| `pipeline_health` | Internal analysis pipeline status |
| `storage_health` | Storage health — DB sizes, genealogy, duplicates, anomalies |
| `watcher_alerts` | Active file watcher alerts |
| `patterns` | Event patterns and semantic connections |
| `race_conditions` | Async race condition detection |
| `async_analysis` | Deep analysis of async functions |
| `society` | Functional cohesion clusters |
| `modules` | Module inventory |
| `molecule` | Atoms in a specific file + risk (requires `filePath`) |
| `prioritized_backlog` | Prioritized tech debt backlog |

---

### Action Tools — Modify Code

| Tool | Purpose | Required Params |
|------|---------|----------------|
| **`atomic_edit`** | Safe edit with syntax validation + dependent vibration analysis | `filePath`, `oldString`, `newString` |
| **`atomic_write`** | Create new file with validation — indexes atom immediately | `filePath`, `content` |
| **`safe_edit`** | Edit by line number or pattern — auto-fetches context | `filePath`, `newContent` + `lineNumber` or `pattern` |
| **`get_edit_context`** | Get exact edit context for a line number (use before atomic_edit) | `filePath`, `lineNumber` |
| **`fix_imports`** | Fix broken imports by searching the global graph. `execute: false` = preview | `filePath` |
| **`validate_imports`** | Check for broken/circular/unused imports | `filePath` |
| **`validate_exports`** | Verify imports match the export chain | `filePath` |
| **`move_file`** | Move file + update ALL imports across the project atomically | `oldPath`, `newPath` |
| **`folderize_family`** | Move a cohesive family to a dedicated folder. `execute: false` = preview | `candidatePath` |
| **`rename_folderized_family`** | Rename internal basenames of a folderized family | `candidatePath` |
| **`normalize_folderized_family_names`** | Normalize names within a folderized family without moving | `candidatePath` |
| **`detect_folderization_opportunities`** | Scan project for folderization candidates | — |
| **`execute_solid_split`** | Split a god-function (SOLID). `execute: false` = preview | `filePath`, `symbolName` |
| **`split_large_file`** | Split files >300 lines using coordinator/barrel pattern. `execute: false` = preview | `filePath` |
| **`suggest_refactoring`** | AI-powered refactoring suggestions by graph analysis | — |
| **`suggest_architecture`** | DDD refactoring — regroup cohesive scattered files | — |
| **`suggest_canonical_api`** | Detect direct DB access and suggest canonical API replacements | `filePath` |
| **`consolidate_conceptual_cluster`** | Consolidate duplicates toward a Source of Truth | `semanticFingerprint`, `ssotFilePath` |
| **`generate_tests`** | Analyze or generate tests for a function. `action: "analyze"` or `"generate"` | `filePath` |
| **`generate_batch_tests`** | Batch test generation for uncovered high-complexity functions | — |

---

### Admin Tools — System Management

| Tool | Purpose | Required Params |
|------|---------|----------------|
| **`get_server_status`** | Complete server health status | — |
| **`get_health_panel`** | One-screen health panel: status + trend + next action | — |
| **`get_health_snapshot`** | Detailed dashboard with history and trends | — |
| **`get_folderization_snapshot`** | Lightweight folderization guidance + naming debt | — |
| **`get_schema`** | Schema info: `type: "atoms"` (atom stats) or `"database"` (SQLite health) | — |
| **`execute_sql`** | Direct SQL query against OmnySys DB | `query` |
| **`get_technical_debt_report`** | Automated tech debt report with duplicates + orphans | — |
| **`check_pipeline_integrity`** | Full pipeline integrity check (9 checks) | — |
| **`detect_performance_hotspots`** | Detect O(n²), blocking I/O, memory risks | — |
| **`restart_server`** | Restart server — see modes below | — |
| **`get_recent_errors`** | Recent warnings/errors from logger | — |
| **`get_tool_inventory_report`** | Tool catalog with consolidation recommendations | — |
| **`get_system_inventory_report`** | System inventory: canonical surfaces, bridges, wrappers | — |
| **`get_canonical_promotion_report`** | Promotion plan for emergent surfaces | — |
| **`list_tools`** | List all 43 tools with schemas. `includeSchemas: true` for full details | — |
| **`diagnose_tool_health`** | Analyze MCP tool execution health — failure rates, performance | — |

#### `restart_server` — Modes

| Mode | What it does | When to use |
|------|-------------|-------------|
| `{ clearCacheOnly: true }` | Flush in-memory cache + refresh tool registry | **After editing code** ← most common |
| `{ reindexOnly: true }` | Force Layer A re-analysis without clearing DB | Changes to analyzed files |
| `{ reanalyze: true }` | Full destructive wipe + full reindex | Complete reset |
| `{ refreshOnly: true }` | Refresh metadata only | Config changes without reindex |
| `{ softReload: true }` | Soft reload — orchestrator + runtime state | When orchestrator is stale |

> ⚠️ **NEVER kill node processes manually.** Always use `restart_server({ clearCacheOnly: true })` — the system handles restarts correctly.

---

### Anti-Patterns

| Don't | Why | Do Instead |
|-------|-----|-----------|
| Create without `query_graph(instances)` | Duplicate dead code | Search first |
| Edit without `traverse_graph(impact_map)` | Break dependencies silently | Check impact first |
| Ignore `_recentErrors` | Miss watcher warnings | Always check after edits |
| Kill node processes manually | `restart_server` already handles it | Use `restart_server` |
| Assume which tools exist | Catalog changes with updates | Call `list_tools()` first |

---

### Tips

- **`_recentErrors`** is auto-injected on **EVERY** tool response. No need to call `get_recent_errors()` separately if you're already using another tool.
- **`aggregate_metrics({ aggregationType: "storage_health" })`** — Check storage health (DB sizes, genealogy coverage, duplicate detection).
- **`get_schema({ type: "database" })`** — Verify SQLite schema health and drift.
- **`execute_sql({ query: "SELECT ..." })`** — Run any SQL against the OmnySys DB directly.
- **`get_health_panel()`** — Quick health check with trend and recommended next action.

<!-- END OMNYSYS MCP TOOLS REFERENCE -->

---

## Project Conventions

| Parameter | Limit |
|-----------|-------|
| Max CC per function | ≤ 15 (optimal ≤ 10) |
| Max lines per function | ≤ 250 |
| Test coverage | > 80% |
| SQLite bulk save | Max 50 atoms per batch |
| Supported languages | JS/TS |

---

## About `_recentErrors`

The server automatically injects warnings/errors into **ANY** tool response under the `_recentErrors` key. You don't need to call `get_recent_errors()` explicitly if you're already using another tool — errors will appear there.

`_recentErrors` structure:
```js
{
  logs: [],           // Logger logs
  watcherAlerts: [],  // File watcher alerts
  summary: { errors: N, warnings: N, total: N }
}
```
