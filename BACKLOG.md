# Backlog Operativo

## Bugs y observaciones abiertas

- `src/layer-c-memory/mcp/tools/atomic-edit/validators.js` is now split into smaller helpers, but the runtime module still needs a reload before we trust the live watcher result.
- `src/layer-c-memory/storage/repository/adapters/sqlite-bulk-operations.js` no longer carries the high complexity alert, but the conceptual duplicate on `saveMany` is still active.
- `src/layer-a-static/pipeline/call-relations-linkage.js` and `src/layer-c-memory/storage/repository/adapters/helpers/relations.js` are now split further, but the `saveMany` conceptual duplicate remains by contract compatibility.
- `SQLiteRelationOperations`, `link.js`, and the test-factory surfaces surfaced by watcher traversal should stay under watch for future structural growth, but the current DB/call-graph canonicity is healthy.
- `src/shared/compiler/compiler-contract-layer.js` is now split around helper builders and the mixed-barrel policy is live, but the watcher still reports a low-impact `arch_impact_low` alert that looks structural rather than functional.
- Import/export validation is now DB-only; the remaining cleanup is runtime reload and any future naming cleanup for the `filesystem-validation` helper alias.
- Watcher alert lifecycle should reconcile against the current published analysis generation immediately after a file fix. Today, tool/runtime module staleness can leave an old alert active until reload, which makes `_recentErrors` lag behind the actual source state. The target is: fixed code on disk should expire the old alert, leave only `stale/restart-required` markers for reload-only modules, and surface only genuinely new issues.

## Notes

- Any new bug or regression found during validation should be appended here before merging.
- Prefer canonical SQL and runtime verification over watcher-only signals when the two disagree.
