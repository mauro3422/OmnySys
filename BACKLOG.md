# Backlog Operativo

## Bugs y observaciones abiertas

- Indexability audit: some surfaces are healthy at runtime but still missing from graph traversal or watcher-driven index snapshots. Add a policy check that distinguishes `out-of-scope`, `legacy`, and `must-index` paths before reporting them as missing.
- Coverage gate for required surfaces: make `tests/factories`, `core/file-watcher`, `core/orchestrator`, `core/unified-server`, and `shared/compiler` report their expected index status explicitly so downstream tools can tell coverage gaps from intentional exclusions.
- `src/layer-a-static/extractors/metadata/index.js` is still regex-first at the file-surface entrypoint, but `src/layer-a-static/pipeline/metadata-gateway.js` now unifies file, batch, and atom surfaces for callers. If file-level Tree-Sitter metadata should become canonical, the next step is to wire the gateway through the Tree-Sitter bridge and replace the current side-effects TODO with the tier-3 detector.
- File-surface Tree-Sitter canonicalization is intentionally deferred for now. The gateway already exposes a stable contract and the atom-surface bridge now fills canonical `sideEffects`, so the remaining work is to decide whether the added precision justifies the extra cost at file scope before changing `extractAllMetadata()` semantics.
- `src/layer-c-memory/mcp/tools/atomic-edit/validators.js` is now split into smaller helpers, but the runtime module still needs a reload before we trust the live watcher result.
- `src/layer-c-memory/storage/repository/adapters/sqlite-bulk-operations.js` no longer carries the high complexity alert, but the conceptual duplicate on `saveMany` is still active.
- `src/layer-a-static/pipeline/call-relations-linkage.js` and `src/layer-c-memory/storage/repository/adapters/helpers/relations.js` are now split further, but the `saveMany` conceptual duplicate remains by contract compatibility.
- `SQLiteRelationOperations`, `link.js`, and the test-factory surfaces surfaced by watcher traversal should stay under watch for future structural growth, but the current DB/call-graph canonicity is healthy.
- `src/shared/compiler/dead-code-utils.js` is now split into taxonomy/normalization/suspicion/sql/drift/reporting helpers, but the runtime still needs a reload before the watcher drops the stale-module marker.
- `src/shared/compiler/compiler-contract-layer.js` is now split around helper builders and the mixed-barrel policy is live, but the watcher still reports a low-impact `arch_impact_low` alert that looks structural rather than functional.
- `src/shared/compiler/system-map-persistence.js` now uses active-file coverage for `system_files` drift checks, and `src/shared/compiler/system-map-persistence-repair-dependencies.js` owns the `file_dependencies` rebuild. The remaining follow-up is to reload the runtime and keep the live status aligned with the corrected DB-only heuristic.
- `src/shared/compiler/data-gateway-contract.js` now exposes the DB-first freshness ledger and is folded into `compiler-contract-layer.js` as a first-class governance surface. The remaining follow-up is to reload the runtime and verify the new governance summary stays visible in live MCP status.
- `src/shared/compiler/system-map-persistence-repair.js` now repopulates `semantic_connections` from atom semantic metadata, but the live MCP runtime still needs a reload so the newly patched repair path and semantic guidance strings are active in-memory.
- `src/shared/compiler/metadata-surface-parity.js` now compares mirrored support coverage against the active file universe. The remaining follow-up is to keep the reload lifecycle clean so the watcher doesn't retain stale export-validation logs after this heuristic change.
- Import/export validation is now DB-only; the remaining cleanup is runtime reload and any future naming cleanup for the `filesystem-validation` helper alias.
- Watcher alert lifecycle should reconcile against the current published analysis generation immediately after a file fix. Today, tool/runtime module staleness can leave an old alert active until reload, which makes `_recentErrors` lag behind the actual source state. The target is: fixed code on disk should expire the old alert, leave only `stale/restart-required` markers for reload-only modules, and surface only genuinely new issues.
- Atoms trust gate: atoms remain the source of truth, but downstream automation should score confidence from `databaseHealth`, `runtimeCodeFreshness`, `surfaceAudit`, `metadataExtractionCoverage`, and watcher lifecycle. Treat the 24 medium-risk files as coordination surfaces for targeted hardening, not as 24 independent bugs.
- SQLite durability bridge follow-up: the canonical repository bridge now queues durable writes and the runtime status surface reports queue depth, but we still need one more pass to make every derived writer honor the same contract. Watch `persistGraphMetrics`, `session-manager-methods`, and any new bulk writer for accidental direct writes while SQLite is busy.
- Runtime lock noise follow-up: `database is locked` is now treated as transient in the main recovery path, but the remaining diagnostic goal is to ensure every replay path surfaces as `queued/skipped` instead of `error` unless data truly cannot be reconstructed.
- Phase 2 parse-noise follow-up: the deep scan still reports unsupported-syntax parse failures in a few test fixtures. Those files are not runtime bugs, but they should be tracked so the analysis pipeline can distinguish fixtures from production surfaces.
- Restart discipline follow-up: when a stale module is patched, prefer hot-reload plus `get_server_status()` verification first. Only restart the IDE if the daemon still reports stale tool modules after the proxy reload window.
- Folderization smoke-test follow-up: every `move_file` or folderization pass should finish with a Node import smoke test on the new barrel, because stale relative imports inside the moved folder can survive the physical move and only show up when the barrel is loaded.
- Live-row drift follow-up: `runtime_table_health_live_row_drift` is now suppressed when Phase 2 is still settling and only relation rows are stale. If it reappears after Phase 2 completes, inspect the orphan-relation cleanup path rather than treating it as a generic atom/file drift.
- Folderization naming follow-up: the naming planner is now split into helper + wrapper modules. Keep an eye on future family growth so barrel selection and collision avoidance stay below the watcher size threshold.
- Folderization dependency rewrite follow-up: the planner now resolves `export from` edges and the move orchestrator rewrites imports inside the moved file itself, because the first pass only fixed dependents and left the moved barrel crashing on stale sibling paths.

## Consolidacion arquitectonica: grupos conceptuales accionables

### Metodo de ataque

1. Priorizar grupos con mayor riesgo y fan-out.
2. Separar hook de framework, helper reutilizable y duplicado conceptual real.
3. Si el grupo es un helper privado generico, moverlo a `src/shared/utils/`.
4. Si el grupo es un wrapper de contrato canÃƒÆ’Ã‚Â³nico, dejarlo como fachada fina y reforzar la policy.
5. Si el grupo mezcla negocio y presentacion, extraer el contrato canonico y dejar el consumidor liviano.

### Orden inicial de trabajo

- `analyze:logic:core:fn`
  - Alta prioridad.
  - Suele indicar lÃƒÆ’Ã‚Â³gica de anÃƒÆ’Ã‚Â¡lisis repetida o wrappers cercanos al motor de inspeccion.
  - Buscar consolidaciÃƒÆ’Ã‚Â³n en helpers de analisis o en una api canonica de evaluaciÃƒÆ’Ã‚Â³n.

- `generate:logic:core:recommendations`
  - Alta prioridad.
  - Suele mezclar generacion de recomendaciones con presentacion o scoring local.
  - Validar si puede delegarse a una sola recomendacion canonica por dominio.

- `get:logic:core:id`
  - Alta prioridad.
  - Suele ser helper de identidad demasiado cercano al dominio de negocio.
  - Evaluar si debe vivir en utilidades compartidas o en una capa de contrato de identidad.

- `process:storage:core:reload`
  - Prioridad media.
  - Puede ser orquestacion valida, pero conviene verificar si hay duplicacion de reload/recovery.

- `get:telemetry:core:stats`
  - Prioridad media-baja.
  - Normalmente es seÃƒÆ’Ã‚Â±al de lectura/summary; revisar solo si hay recomposicion manual fuera del summary canÃƒÆ’Ã‚Â³nico.

### Criterio de cierre

- Si el grupo termina siendo un hook de framework, se mantiene y se documenta en policy.
- Si el grupo termina siendo un helper reusable, se mueve a `src/shared/utils/` o a un modulo canonico equivalente.
- Si el grupo termina siendo un wrapper de presentacion, se fuerza a pasar por `data-gateway` + `summary_presentation`.
- Si el grupo termina siendo duplicado real, se consolida y se eliminan las copias.

## Notes

- Any new bug or regression found during validation should be appended here before merging.
- Prefer canonical SQL and runtime verification over watcher-only signals when the two disagree.
