# Backlog Operativo

## Bugs y observaciones abiertas

- `src/layer-a-static/extractors/metadata/index.js` is still regex-first at the file-surface entrypoint, but `src/layer-a-static/pipeline/metadata-gateway.js` now unifies file, batch, and atom surfaces for callers. If file-level Tree-Sitter metadata should become canonical, the next step is to wire the gateway through the Tree-Sitter bridge and replace the current side-effects TODO with the tier-3 detector.
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

## Consolidacion arquitectonica: grupos conceptuales accionables

### Metodo de ataque

1. Priorizar grupos con mayor riesgo y fan-out.
2. Separar hook de framework, helper reutilizable y duplicado conceptual real.
3. Si el grupo es un helper privado generico, moverlo a `src/shared/utils/`.
4. Si el grupo es un wrapper de contrato canónico, dejarlo como fachada fina y reforzar la policy.
5. Si el grupo mezcla negocio y presentacion, extraer el contrato canonico y dejar el consumidor liviano.

### Orden inicial de trabajo

- `analyze:logic:core:fn`
  - Alta prioridad.
  - Suele indicar lógica de análisis repetida o wrappers cercanos al motor de inspeccion.
  - Buscar consolidación en helpers de analisis o en una api canonica de evaluación.

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
  - Normalmente es señal de lectura/summary; revisar solo si hay recomposicion manual fuera del summary canónico.

### Criterio de cierre

- Si el grupo termina siendo un hook de framework, se mantiene y se documenta en policy.
- Si el grupo termina siendo un helper reusable, se mueve a `src/shared/utils/` o a un modulo canonico equivalente.
- Si el grupo termina siendo un wrapper de presentacion, se fuerza a pasar por `data-gateway` + `summary_presentation`.
- Si el grupo termina siendo duplicado real, se consolida y se eliminan las copias.

## Notes

- Any new bug or regression found during validation should be appended here before merging.
- Prefer canonical SQL and runtime verification over watcher-only signals when the two disagree.
