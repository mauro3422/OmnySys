
<!-- OMNYSYS MCP TOOLS REFERENCE — Auto-injected by OmnySys installer -->

## OmnySys MCP Tools — Reference Guide

> **Golden Rule:** Before creating → verify it doesn't exist. Before editing → check impact. After editing → check for errors.

### Standard Workflow

```js
// Step 0: ALWAYS start here — see what tools are available
list_tools({ includeSchemas: false })

// Step 1: Before creating — check if it exists
query_graph({ queryType: "instances", symbolName: "myFunction" })

// Step 2: Before editing — check what breaks
traverse_graph({ traverseType: "impact_map", filePath: "src/file.js" })

// Step 3: Edit safely
atomic_edit({ filePath, oldString, newString })

// Step 4: Verify (errors auto-appear in _recentErrors on ANY response)
get_recent_errors()
```

---

### Query Tools — Inspect Code

| Tool | When to Use | Required Params |
|------|-------------|----------------|
| **`query_graph`** | `instances` (find all occurrences), `details` (full metadata+DNA+dataFlow), `history` (Git commits) | `queryType` |
| **`traverse_graph`** | `impact_map` (what breaks if I change this?), `call_graph` (who calls whom?) | `traverseType`, `filePath` |
| **`impact_atomic`** | Simulate impact before modifying: `intent: "usage"`, `"deletion"`, `"signature_change"` | `symbolName` |
| **`get_atom_history`** | Git history of a symbol — who changed what and when | `symbolName`, `filePath` |
| **`get_atom_evolution_report`** | Full evolution report: details + DNA + dataFlow + impact + Git + archive | `symbolName`, `filePath` |
| **`aggregate_metrics`** | Grouped metrics — see aggregationType table below | `aggregationType` |

#### `aggregate_metrics` — aggregationType Values

| Type | Returns |
|------|---------|
| `health` | Average fragility, coupling, cohesion |
| `risk` | Files by risk level (Critical/High/Medium/Low) |
| `duplicates` | Structural clones by DNA |
| `isomorphism` | Isomorphic duplicate detection |
| `conceptual_duplicates` | Semantic duplicates (same purpose, different impl) |
| `pipeline_health` | Internal analysis pipeline status |
| `storage_health` | DB sizes, genealogy, duplicates, anomalies |
| `watcher_alerts` | Active file watcher alerts |
| `patterns` | Event patterns and semantic connections |
| `race_conditions` | Async race condition detection |
| `async_analysis` | Deep analysis of async functions |
| `society` | Functional cohesion clusters |
| `modules` | Module inventory |
| `molecule` | Atoms in a file + risk (needs `filePath`) |
| `prioritized_backlog` | Prioritized tech debt backlog |

---

### Action Tools — Modify Code

| Tool | Purpose | Required Params |
|------|---------|----------------|
| **`atomic_edit`** | Safe edit — validates syntax + analyzes dependent vibration | `filePath`, `oldString`, `newString` |
| **`atomic_write`** | Create file with validation — indexes atom immediately | `filePath`, `content` |
| **`safe_edit`** | Edit by line or pattern — auto-fetches context. Needs EITHER `lineNumber` OR `pattern` | `filePath`, `newContent` |
| **`get_edit_context`** | Get exact context for a line (use before atomic_edit when unsure of oldString) | `filePath` |
| **`fix_imports`** | Fix broken imports. `execute: false` = preview only | `filePath` |
| **`validate_imports`** | Check broken/circular/unused imports | `filePath` |
| **`validate_exports`** | Verify imports match export chain | `filePath` |
| **`move_file`** | Move file + update ALL imports project-wide | `oldPath`, `newPath` |
| **`folderize_family`** | Move cohesive family to dedicated folder. `execute: false` = preview | `candidatePath` |
| **`rename_folderized_family`** | Rename basenames inside folderized family. `mode: "plan"` = preview | `candidatePath` |
| **`normalize_folderized_family_names`** | Normalize names without moving files | `candidatePath` |
| **`detect_folderization_opportunities`** | Scan for folderization candidates, monoliths, naming debt | — |
| **`execute_solid_split`** | Split god-function (SOLID). `execute: false` = preview | `filePath`, `symbolName` |
| **`split_large_file`** | Split >300 line files into coordinator/barrel. `execute: false` = preview | `filePath` |
| **`suggest_refactoring`** | Graph-based refactoring suggestions | — |
| **`suggest_architecture`** | DDD refactoring — regroup cohesive scattered files | — |
| **`suggest_canonical_api`** | Detect direct DB access → suggest canonical APIs | `filePath` |
| **`consolidate_conceptual_cluster`** | Merge duplicates toward a Source of Truth | `semanticFingerprint`, `ssotFilePath` |
| **`generate_tests`** | Analyze or generate tests. `action: "analyze"` or `"generate"` | `filePath` |
| **`generate_batch_tests`** | Batch test generation for uncovered complex functions | — |

---

### Admin Tools — System Management

| Tool | Purpose | Params |
|------|---------|--------|
| **`get_server_status`** | Complete server health | — |
| **`get_health_panel`** | One-screen: status + trend + next action | — |
| **`get_health_snapshot`** | Detailed dashboard with history | — |
| **`get_folderization_snapshot`** | Folderization guidance + naming debt | — |
| **`get_schema`** | `type: "atoms"` (stats) or `"database"` (SQLite health) | — |
| **`execute_sql`** | SQL against OmnySys DB (omnysys.db only) | `query` |
| **`get_technical_debt_report`** | Tech debt: duplicates + orphans + score | — |
| **`check_pipeline_integrity`** | 9-check pipeline integrity | — |
| **`detect_performance_hotspots`** | O(n²), blocking I/O, memory risks | — |
| **`restart_server`** | Restart — see modes below | — |
| **`get_recent_errors`** | Recent warnings/errors from logger | — |
| **`get_tool_inventory_report`** | Tool catalog with recommendations | — |
| **`get_system_inventory_report`** | Canonical surfaces, bridges, wrappers | — |
| **`get_canonical_promotion_report`** | Promotion plan for emergent surfaces | — |
| **`list_tools`** | All 43 tools. `includeSchemas: true` = full schemas | — |
| **`diagnose_tool_health`** | MCP tool failure rates, performance | — |

#### `restart_server` — Modes

| Mode | What it does | When to use |
|------|-------------|-------------|
| `{ clearCacheOnly: true }` | Flush cache + refresh tool registry | **After editing code** ← most common |
| `{ reindexOnly: true }` | Re-analyze Layer A without clearing DB | Changes to analyzed files |
| `{ reanalyze: true }` | Destructive full wipe + full reindex | Complete reset |
| `{ refreshOnly: true }` | Refresh metadata only | Config changes, no reindex |
| `{ softReload: true }` | Soft reload — orchestrator + runtime | When orchestrator is stale |

> ⚠️ **NEVER kill node processes manually.** Use `restart_server({ clearCacheOnly: true })`.

---

### Real Anti-Patterns (Learned from Experience)

| Mistake | What Happened | Correct Approach |
|---------|--------------|-----------------|
| Killing node processes manually | Broke MCP session, had to manually restart proxy | `restart_server({ clearCacheOnly: true })` |
| Querying `atom_versions_archive` via `execute_sql` | "no such table" — it's in atom-history.db, not omnysys.db | Use `get_atom_history` or `get_atom_evolution_report` instead |
| Not calling `list_tools()` first | Used deprecated tool names that confused the AI | Always start with `list_tools({ includeSchemas: false })` |
| `query_graph(details)` without `filePath` | "MISSING_PARAMS" error — needs BOTH symbolName AND filePath | Always provide both required params |
| `safe_edit` without `lineNumber` or `pattern` | Fails — needs one of the two | Use EITHER `lineNumber` OR `pattern` (oneOf constraint) |
| Assuming `aggregate_metrics` types | Had to guess aggregationType values | Check the aggregationType table above or call `list_tools` |
| `traverse_graph` with wrong `traverseType` | Silent empty results | Use `impact_map` for impact, `call_graph` for call tree |
| Ignoring `_recentErrors` in responses | Missed watcher warnings about created issues | Check `_recentErrors` on EVERY tool response |
| Not using `execute: false` for previews | Applied changes directly without seeing the plan | Always preview first: `execute_solid_split(..., execute: false)` |

---

### Tips

- **`_recentErrors`** is auto-injected on **EVERY** tool response. No need for explicit `get_recent_errors()`.
- **`aggregate_metrics({ aggregationType: "storage_health" })`** — DB sizes, genealogy, anomalies.
- **`get_schema({ type: "database" })`** — SQLite schema health and drift.
- **`execute_sql({ query: "SELECT ..." })`** — Only works on omnysys.db, NOT atom-history.db.
- **`get_health_panel()`** — Quick health + trend + recommended next action.
- **`get_edit_context({ filePath, lineNumber })`** — Get exact context before editing when unsure of oldString.
- **Preview before action:** Most action tools support `execute: false` for dry-run. Use it.

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

The server automatically injects warnings/errors into **ANY** tool response under the `_recentErrors` key. You don't need to call `get_recent_errors()` explicitly if you're already using another tool.

Structure:
```js
{
  logs: [],           // Logger logs
  watcherAlerts: [],  // File watcher alerts
  summary: { errors: N, warnings: N, total: N }
}
```
