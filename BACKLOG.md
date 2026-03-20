# Backlog Operativo

## Bugs y observaciones abiertas

- `src/layer-c-memory/mcp/tools/atomic-edit/validators.js` is now split into smaller helpers, but the runtime module still needs a reload before we trust the live watcher result.
- `src/layer-c-memory/storage/repository/adapters/sqlite-bulk-operations.js` no longer carries the high complexity alert, but the conceptual duplicate on `saveMany` is still active.
- `src/layer-a-static/pipeline/call-relations-linkage.js` is now correct and aligned with canonical relation writes, but the persistence path is still right at the medium-complexity threshold.
- `src/layer-a-static/pipeline/shared-state-linkage.js` remains a medium-complexity follow-up if more semantic linkage logic is added.
- `SQLiteRelationOperations`, `link.js`, and `src/layer-c-memory/storage/repository/adapters/helpers/relations.js` should stay under watch for future structural growth, but the current DB/call-graph canonicity is healthy.

## Notes

- Any new bug or regression found during validation should be appended here before merging.
- Prefer canonical SQL and runtime verification over watcher-only signals when the two disagree.
