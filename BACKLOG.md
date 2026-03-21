# Backlog Operativo

## Bugs y observaciones abiertas

- `src/layer-c-memory/mcp/tools/atomic-edit/validators.js` is now split into smaller helpers, but the runtime module still needs a reload before we trust the live watcher result.
- `src/layer-c-memory/storage/repository/adapters/sqlite-bulk-operations.js` no longer carries the high complexity alert, but the conceptual duplicate on `saveMany` is still active.
- `src/layer-a-static/pipeline/call-relations-linkage.js` and `src/layer-c-memory/storage/repository/adapters/helpers/relations.js` are now split further, but the `saveMany` conceptual duplicate remains by contract compatibility.
- `SQLiteRelationOperations`, `link.js`, and the test-factory surfaces surfaced by watcher traversal should stay under watch for future structural growth, but the current DB/call-graph canonicity is healthy.
- `src/shared/compiler/dead-code-utils.js` is now split into taxonomy/normalization/suspicion/sql/drift/reporting helpers, but the runtime still needs a reload before the watcher drops the stale-module marker.
- `src/shared/compiler/compiler-contract-layer.js` is now split around helper builders and the mixed-barrel policy is live, but the watcher still reports a low-impact `arch_impact_low` alert that looks structural rather than functional.
- `src/shared/compiler/system-map-persistence.js` now uses active-file coverage for `system_files` drift checks, and `src/shared/compiler/system-map-persistence-repair-dependencies.js` owns the `file_dependencies` rebuild. The remaining follow-up is to reload the runtime and keep the live status aligned with the corrected DB-only heuristic.
- `src/shared/compiler/data-gateway-contract.js` now exposes the DB-first freshness ledger. The remaining follow-up is to see whether the same policy should be folded into `compiler-contract-layer.js` as a first-class governance surface, or whether the snapshot/status layer is enough for the current sprint.
- `src/shared/compiler/metadata-surface-parity.js` now compares mirrored support coverage against the active file universe. The remaining follow-up is to keep the reload lifecycle clean so the watcher doesn't retain stale export-validation logs after this heuristic change.
- Import/export validation is now DB-only; the remaining cleanup is runtime reload and any future naming cleanup for the `filesystem-validation` helper alias.
- Watcher alert lifecycle should reconcile against the current published analysis generation immediately after a file fix. Today, tool/runtime module staleness can leave an old alert active until reload, which makes `_recentErrors` lag behind the actual source state. The target is: fixed code on disk should expire the old alert, leave only `stale/restart-required` markers for reload-only modules, and surface only genuinely new issues.

## Notes

- Any new bug or regression found during validation should be appended here before merging.
- Prefer canonical SQL and runtime verification over watcher-only signals when the two disagree.
