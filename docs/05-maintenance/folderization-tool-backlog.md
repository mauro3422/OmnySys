# Folderization Tool Backlog

Status: open

## Observed Problems

- `folderize_family` can time out on larger families and leave a move half applied.
- `rename_folderized_family` can lose the family context when the selected candidate no longer matches the on-disk state.
- Partial moves can leave stale imports or deleted paths in the worktree before final reconciliation.
- Canonical validation can report `DB_MISSING` until the full reindex catches up with the folder move.
- Some folderization runs finish with a partial rename set and do not surface that clearly enough to the caller.
- The current guidance is global; it does not yet prefer the nearest family by `scopePath` or `focusPath`.
- The system still needs a DB-first reuse signal for helper surfaces and barrels, not just folder move candidates.
- Naming normalization should recognize barrels, helpers, and short role stems as separate policy shapes instead of one flat rename bucket.
- Cross-system duplication should be compared by family fingerprints, not only by file stem or raw folderization state.
- Folderization health should feed a historical metrics snapshot so progress can be compared across runs instead of only being reported as a point-in-time state.
- The new folderization automation planner is analysis-first by design; it still needs a safe execution bridge if we want one-click folderize/rename behavior from the planner itself.
- The automation planner now exposes propagation and connected-system metadata, but the large dashboard/snapshot builder cluster still needs deeper consolidation before we can treat automation as low-risk by default.

## Follow-Up Work

- Make folderization run as one logical transaction: move, rename, rewrite imports, then validate.
- Wait for canonical reconciliation before reporting success.
- Add regression tests for timeout, partial move, stale import rewrite, and post-move validation.
- Improve the tool response so partial completion is explicit instead of looking like a clean success.
- Add `scopePath` and `focusPath` to folderization guidance so the selected family comes from the nearest DB-backed context.
- Add a DB-first family reuse signal so the tool can recommend an existing folder, helper barrel, or nearby family before creating a new surface.
- Split naming guidance into explicit policies for helpers, barrels, and collision avoidance.
- Add a family fingerprint comparison layer so the tool can detect duplication between systems, not just within a single family.
- If we later allow direct execution from the automation planner, gate it behind the existing rename flow and revalidation path instead of adding a second mutator.

## Working Notes

- Prefer the folderized layout convention: `family-name/<role>.js`.
- Keep the folder barrel thin and stable.
- Re-run import validation after any folder move that changes canonical paths.
- Treat `scopePath`/`focusPath` as query hints over the database, not as a second source of truth.
