# Folderization Tool Backlog

Status: open

## Observed Problems

- `folderize_family` can time out on larger families and leave a move half applied.
- `rename_folderized_family` can lose the family context when the selected candidate no longer matches the on-disk state.
- Partial moves can leave stale imports or deleted paths in the worktree before final reconciliation.
- Canonical validation can report `DB_MISSING` until the full reindex catches up with the folder move.
- Some folderization runs finish with a partial rename set and do not surface that clearly enough to the caller.

## Follow-Up Work

- Make folderization run as one logical transaction: move, rename, rewrite imports, then validate.
- Wait for canonical reconciliation before reporting success.
- Add regression tests for timeout, partial move, stale import rewrite, and post-move validation.
- Improve the tool response so partial completion is explicit instead of looking like a clean success.

## Working Notes

- Prefer the folderized layout convention: `family-name/<role>.js`.
- Keep the folder barrel thin and stable.
- Re-run import validation after any folder move that changes canonical paths.
