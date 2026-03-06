/**
 * @fileoverview Repository helpers for circular dependency guards.
 *
 * Keeps SQL/query concerns out of circular-guard so the guard can focus on
 * cycle classification and orchestration.
 *
 * @module core/file-watcher/guards/circular-repository
 */

export function getCircularFileImports(db) {
  if (!db) return [];

  return db.prepare(`
    SELECT path, imports_json
    FROM files
  `).all();
}

export function getCircularCallRelations(db) {
  if (!db) return [];

  return db.prepare(`
    SELECT source_id, target_id
    FROM atom_relations
    WHERE relation_type = 'calls'
  `).all();
}

export function getCircularLocalAtoms(db, filePath) {
  if (!db) return [];

  return db.prepare(`
    SELECT id, calls_json
    FROM atoms
    WHERE file_path = ?
  `).all(filePath);
}

export function prepareFileDependencyLookup(db) {
  if (!db) return null;

  try {
    return db.prepare(`
      SELECT DISTINCT target_path
      FROM file_dependencies
      WHERE source_path = ?
    `);
  } catch {
    return null;
  }
}
