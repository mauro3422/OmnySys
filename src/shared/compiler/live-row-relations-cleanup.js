/**
 * @fileoverview Canonical cleanup helpers for atom_relations projections.
 *
 * @module shared/compiler/live-row-relations-cleanup
 */

export function buildOrphanRelationCleanupStatement() {
  return `
    UPDATE atom_relations
    SET is_removed = 1,
        lifecycle_status = 'removed',
        updated_at = datetime('now')
    WHERE (is_removed IS NULL OR is_removed = 0)
      AND (
        NOT EXISTS (
          SELECT 1
          FROM atoms src
          WHERE src.id = atom_relations.source_id
            AND (src.is_removed IS NULL OR src.is_removed = 0)
        )
        OR NOT EXISTS (
          SELECT 1
          FROM atoms tgt
          WHERE tgt.id = atom_relations.target_id
            AND (tgt.is_removed IS NULL OR tgt.is_removed = 0)
        )
      )`;
}
