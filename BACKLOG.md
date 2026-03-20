# Backlog Operativo

## Bugs y observaciones abiertas

- `src/layer-c-memory/mcp/tools/atomic-edit/validators.js` still trips a high-complexity warning. The import fix is correct, but the validator should be split before more policy lands there.
- `src/layer-c-memory/storage/repository/adapters/sqlite-bulk-operations.js` is still the biggest structural hotspot and carries both a high complexity warning and a conceptual duplicate on `saveMany`.
- `src/layer-a-static/pipeline/call-relations-linkage.js` is now correct and aligned with canonical relation writes, but the persistence path is still right at the medium-complexity threshold.
- `src/layer-a-static/pipeline/shared-state-linkage.js` remains a medium-complexity follow-up if more semantic linkage logic is added.
- `SQLiteBulkOperations`, `SQLiteRelationOperations`, and `link.js` should stay under watch for future structural growth, but the current DB/call-graph canonicity is healthy.

## Notes

- Any new bug or regression found during validation should be appended here before merging.
- Prefer canonical SQL and runtime verification over watcher-only signals when the two disagree.
