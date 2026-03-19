# Backlog Operativo

## Bugs y observaciones abiertas

- `validate_imports` can report false positives on modules with local exports when the project index is stale. Treat direct Node import loading as the ground truth until the tool is fixed.
- `databaseHealth` now reports `A+` with aligned `call_graph` / `atom_relations` rows. Keep watching the projection, but the drift warning is no longer a live blocker.
- `live-row-utils` must not auto-purge `atom_relations` on bootstrap again. The cleanup is now support-table-only, but any future relation reconciliation should be opt-in and separately audited.
- `validate_imports` still needs a tighter contract around runtime-vs-indexed evidence so stale DB import flags cannot override a successful Node import check.
- `buildCalledByLinks` spends most of the full reindex time in per-relation target resolution and `atom_relations` bulk insert. The 140k-relation save path is now functionally correct but still too slow for startup.
- `call-target-resolver` and `SQLiteRelationOperations` now carry fresh complexity/file-size warnings after the cache work. The optimization is correct, but the resolver should be split before more logic lands there.
- The active-atom cache for relation saving still needs a real benchmark after restart. We have reduced per-call DB lookups, but the save path must be measured again on a cold startup before declaring victory.
- `cleanupOrphanedCompilerArtifacts` / atom removal paths do not currently deactivate `calls` relations for atoms that disappear from a file, so orphan call relations can survive even after the atom is marked removed.
- Phase 2 deep scan re-reads source files for semantic enrichment after Layer A already built the atom graph. Confirm whether the second pass can be narrowed or reused to avoid the extra startup cost.
- `src/layer-c-memory/mcp/tools/status.js` was split into a smaller helper module, but the next runtime restart still needs to confirm the live payload stayed compact and did not reintroduce deep nested blobs.
- `src/layer-c-memory/mcp/core/initialization/steps/mcp-setup-step.js` still trips a low data-flow coherence warning. The tool wrapper is compact enough for now, but the call path should be decomposed if more bootstrap logic lands there.
- The `_recentErrors` wrapper in MCP responses is compacted, but direct and bootstrap paths should keep using the smallest practical log/watcher sample size so status responses stay readable without losing signal.
- Runtime readers no longer depend on `calls_json` / `called_by_json` fallbacks for canonical decisions. Keep the schema/serialization surface as legacy compatibility only.
- `src/shared/compiler/live-row-utils.js` still carries a complexity warning and a small conceptual duplicate warning around `toCount`. It is correct, but it is a refactor candidate.

## Notes

- Any new bug or regression found during validation should be appended here before merging.
- Prefer canonical SQL and runtime verification over watcher-only signals when the two disagree.
