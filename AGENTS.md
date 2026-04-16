



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

> **Golden rule:** After editing code → use `processRestart: true`. The file watcher handles reindex automatically.

| Mode | Process Kill? | DB Preserved? | Reindex? | When to use |
|------|:---:|:---:|:---:|-------------|
| `{ processRestart: true }` | ✅ Yes | ✅ **ALL** | ❌ No | **After editing code** — kills worker, respawns with fresh ESM cache. File watcher reindexes changed files automatically. |
| `{ clearCacheOnly: true }` | ❌ No | ✅ Yes | ❌ No | Fastest — flush in-memory cache + refresh tool registry only. No process restart. |
| `{ reindexOnly: true }` | ❌ No | ✅ Yes | ✅ Yes | Force Layer A re-analysis when an atom was not indexed properly. No process restart. |
| `{ reanalyze: true }` | ✅ Yes | ⚠️ Partial | ✅ Full | **DESTRUCTIVE** — deletes omnysys.db, atom_versions, file_hashes, analysis cache. **Preserves** atom-history.db and health-history.db. Complete reset. |
| `{ refreshOnly: true }` | ❌ No | ✅ Yes | ❌ No | Refresh metadata + cache. Config changes, no reindex. |
| `{ softReload: true }` | ❌ No | ✅ Yes | ❌ No | Soft reload — orchestrator + runtime state. When orchestrator is stale. |

#### Database Architecture — What Gets Deleted and What Doesn't

| Database | Location | Purpose | Deleted by `reanalyze`? | Always Preserved |
|----------|----------|---------|:---:|:---:|
| `omnysys.db` | `.omnysysdata/` | **Active data** — atoms, files, relations, events, societies, risk, sessions, tool runs, metrics | ✅ Yes | ❌ No |
| `atom-history.db` | `.omnysysdata/` | **Version archive** — historical evolution of every atom across Git commits | ❌ No | ✅ Yes |
| `health-history.db` | `.omnysysdata/` | **Metrics history** — health snapshots, trends, comparisons over time | ❌ No | ✅ Yes |

> ⚠️ **NEVER kill node processes manually.** Use `restart_server({ processRestart: true })` after code edits.

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
  watcherAlerts: [],  // File watcher alerts - code quality issues detected by the system
  summary: { errors: N, warnings: N, total: N },
  watcherSummary: { totalAlerts, bySeverity, byType },
  compilerDiagnostics: { total, bySignal },
  provenance: { source, transportOrigin, freshness... }
}
```

### Watcher Alert Types

| Type | Severity | Description |
|------|----------|-------------|
| `arch_impact_high` | HIGH | Impact wave detected - changing this may break callers |
| `code_duplicate_unified_critical_high` | CRITICAL | Same symbols have both structural AND conceptual duplicates |
| `code_duplicate_unified_high` | HIGH | Structural duplicates detected - use atomic_edit instead of copying |
| `code_duplicate_unified_medium` | MEDIUM | Conceptual duplicates - consider consolidating to SSOT |
| `code_conceptual_duplicate_medium` | MEDIUM | Semantic duplicates (same purpose, different implementation) |
| `arch_policy_drift_medium` | MEDIUM | Violations of canonical contracts |
| `code_file_size_medium` | MEDIUM | File is too large (>300 lines) |
| `code_function_length_medium` | MEDIUM | Function exceeds complexity threshold |
| `arch_impact_low` | LOW | Minor impact wave detected |

### How to Respond to Alerts

1. **Duplicates**: Use `consolidate_conceptual_cluster` to merge duplicates toward a Source of Truth
2. **Impact**: Use `traverse_graph({ traverseType: "impact_map" })` before editing
3. **Policy Drift**: Use `consolidate_policy_drifts({ execute: false })` to preview repairs
4. **File Size**: Use `split_large_file({ execute: false })` to preview division

> **IMPORTANT**: Check `_recentErrors` on EVERY tool response. Ignoring alerts leads to technical debt accumulation.

---

## ⚡ Método Principal: Shell Helper (Node.js)

> **IMPORTANTE**: El protocolo MCP de opencode tiene problemas de timeout. SIEMPRE usar el shell helper Node.js como método principal.

### Ubicación
```
src/shells/mcp-shell-helper.js
```

### Uso - SIEMPRE usar node

```bash
# ⚠️ NUNCA usar las tools MCP directamente de opencode - siempre usar:
node src/shells/mcp-shell-helper.js <comando> [args...]

# Con argumentos estilo --key value
node src/shells/mcp-shell-helper.js query_graph --queryType instances --symbolName atomic_edit
```
src/shells/mcp-shell-helper.js
```

### Uso Básico

```bash
# Inicializar y ejecutar comando directo
node src/shells/mcp-shell-helper.js <comando> [args...]

# Con argumentos estilo --key value
node src/shells/mcp-shell-helper.js query_graph --queryType instances --symbolName atomic_edit
```

### Shortcuts Disponibles

| Comando | Descripción |
|---------|-------------|
| `list` | Listar las 47 tools disponibles |
| `status` | Estado del servidor MCP |
| `health` | Panel de salud del sistema |
| `schema` | Schema de atoms (stats) |
| `debt` | Reporte de deuda técnica |
| `modules` | Inventario de módulos |
| `atoms` | Ver schema de átomos |
| `health` | Panel de salud |

### Ejemplos Completos

```bash
# Ver estado del servidor
node src/shells/mcp-shell-helper.js status

# Buscar un símbolo en todo el proyecto
node src/shells/mcp-shell-helper.js query_graph --queryType instances --symbolName atomic_edit

# Ver impacto de un átomo antes de modificarlo
node src/shells/mcp-shell-helper.js impact_atomic --symbolName atomic_edit

# Métricas de salud del proyecto
node src/shells/mcp-shell-helper.js aggregate_metrics --aggregationType health

# Ver debt técnico
node src/shells/mcp-shell-helper.js debt

# Schema de la base de datos
node src/shells/mcp-shell-helper.js schema --type database

# Traversar el grafo de impacto
node src/shells/mcp-shell-helper.js traverse_graph --filePath src/core/file.js --traverseType impact_map
```

### Para qué sirve este fallback?

1. **Cuando opencode MCP timeoutea** — El shell helper hace requests directas
2. **Cuando hay session errors** — Maneja sesiones automáticamente
3. **Para debugging** — Ver requests/responses crudas
4. **Automatización** — Scripts que usan las tools sin opencode

### Solución de Problemas

| Error | Solución |
|-------|----------|
| `ECONNREFUSED` | Verificar que el servidor MCP está corriendo en puerto 9999 |
| `SESSION_EXPIRED` | El shell helper re-inicializa automáticamente |
| `Parse error` | Usar `--file` para pasar argumentos desde archivo JSON |

---

## Instrucciones para el Asistente

> **⚠️ REGLA CRÍTICA**: Cuando el usuario pide usar herramientas MCP:
> 1. **NUNCA** llamar las tools directamente desde opencode
> 2. **SIEMPRE** ejecutar via shell helper: `node src/shells/mcp-shell-helper.js ...`
> 3. Incluir el output completo en la respuesta

### Comandos más usados

```bash
# Health y estado
node src/shells/mcp-shell-helper.js status
node src/shells/mcp-shell-helper.js health
node src/shells/mcp-shell-helper.js debt

# Consultar código
node src/shells/mcp-shell-helper.js query_graph --queryType instances --symbolName <nombre>
node src/shells/mcp-shell-helper.js traverse_graph --filePath <archivo> --traverseType impact_map

# Análisis
node src/shells/mcp-shell-helper.js aggregate_metrics --aggregationType health
node src/shells/mcp-shell-helper.js impact_atomic --symbolName <nombre>
```

Para documentación completa, ver: **OPENCODE.md** (en raíz del proyecto)

---

## Important Links

- **OPENCODE.md** — Shell fallback guide & troubleshooting (REQUIRED READING when MCP fails)
