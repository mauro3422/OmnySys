# Backlog Operativo

## Bugs y observaciones abiertas

- `validate_imports` can report false positives on modules with local exports when the project index is stale. Treat direct Node import loading as the ground truth until the tool is fixed.
- `databaseHealth` still emits a medium `call_graph_projection_drift` warning when the SQL `call_graph` view and active `atom_relations` call rows do not match exactly. Decide whether to normalize the view or keep it as an advisory signal.
- `src/shared/compiler/live-row-utils.js` still carries a complexity warning and a small conceptual duplicate warning around `toCount`. It is correct, but it is a refactor candidate.

## Notes

- Any new bug or regression found during validation should be appended here before merging.
- Prefer canonical SQL and runtime verification over watcher-only signals when the two disagree.
