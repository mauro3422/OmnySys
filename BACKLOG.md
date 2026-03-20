# Backlog Operativo

## Bugs y observaciones abiertas

- `src/layer-c-memory/mcp/tools/atomic-edit/validators.js` is now split into smaller helpers, but the runtime module still needs a reload before we trust the live watcher result.
- `src/layer-c-memory/storage/repository/adapters/sqlite-bulk-operations.js` no longer carries the high complexity alert, but the conceptual duplicate on `saveMany` is still active.
- `src/layer-a-static/pipeline/call-relations-linkage.js` and `src/layer-c-memory/storage/repository/adapters/helpers/relations.js` are now split further, but the `saveMany` conceptual duplicate remains by contract compatibility.
- `SQLiteRelationOperations`, `link.js`, and the test-factory surfaces surfaced by watcher traversal should stay under watch for future structural growth, but the current DB/call-graph canonicity is healthy.

## Notes

- Any new bug or regression found during validation should be appended here before merging.
- Prefer canonical SQL and runtime verification over watcher-only signals when the two disagree.
