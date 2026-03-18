/**
 * Marks test atoms as orphaned when a source atom is deleted.
 * Uses canonical call relations instead of JSON snapshots or text search.
 */

export function markRelatedTestAtoms(db, sourceId, sourceFilePath, logger) {
  if (!db || !sourceId) return;

  try {
    const relatedTests = db.prepare(`
      SELECT DISTINCT a.id
      FROM atom_relations ar
      INNER JOIN atoms a ON ar.source_id = a.id
      WHERE ar.relation_type = 'calls'
        AND COALESCE(ar.is_removed, 0) = 0
        AND ar.target_id = ?
        AND COALESCE(a.is_removed, 0) = 0
        AND a.is_test_callback = 1
    `).all(sourceId);

    for (const testAtom of relatedTests) {
      const currentData = db.prepare(`
        SELECT derived_json
        FROM atoms
        WHERE id = ?
      `).get(testAtom.id);

      if (!currentData) continue;

      let derived = currentData.derived_json ? JSON.parse(currentData.derived_json) : {};
      derived.orphaned = true;
      derived.orphanedFrom = sourceId;
      derived.orphanedAt = new Date().toISOString();
      if (sourceFilePath) {
        derived.orphanedFromFile = sourceFilePath;
      }

      db.prepare(`
        UPDATE atoms SET derived_json = ? WHERE id = ?
      `).run(JSON.stringify(derived), testAtom.id);

      logger?.debug?.(`[SQLiteAdapter] Marked test atom as orphaned: ${testAtom.id}`);
    }
  } catch (error) {
    logger?.warn?.(`[SQLiteAdapter] Failed to mark related tests: ${error.message}`);
  }
}
