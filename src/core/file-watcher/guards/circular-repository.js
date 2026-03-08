/**
 * @fileoverview Repository helpers for circular dependency guards.
 *
 * Keeps SQL/query concerns out of circular-guard so the guard can focus on
 * cycle classification and orchestration.
 *
 * @module core/file-watcher/guards/circular-repository
 */

import { getSystemMapPersistenceCoverage, shouldTrustSystemMapDependencies } from '../../../shared/compiler/index.js';

export function getCircularFileImports(db) {
  if (!db) return [];

  return db.prepare(`
    SELECT path, imports_json
    FROM files
    WHERE COALESCE(is_removed, 0) = 0
  `).all();
}

export function getCircularCallRelations(db, atomIdPattern) {
  if (!db) return [];

  return db.prepare(`
    SELECT source_id, target_id
    FROM atom_relations
    WHERE relation_type = 'calls'
      AND COALESCE(is_removed, 0) = 0
      AND source_id LIKE ?
      AND target_id LIKE ?
  `).all(atomIdPattern, atomIdPattern);
}

export function getCircularLocalAtoms(db, filePath) {
  if (!db) return [];

  return db.prepare(`
    SELECT id, calls_json
    FROM atoms
    WHERE file_path = ?
      AND COALESCE(is_removed, 0) = 0
  `).all(filePath);
}

export function prepareFileDependencyLookup(db) {
  if (!db) return null;

  try {
    const coverage = getSystemMapPersistenceCoverage(db);
    if (!shouldTrustSystemMapDependencies(coverage)) {
      return null;
    }

    return db.prepare(`
      SELECT DISTINCT target_path
      FROM file_dependencies
      WHERE source_path = ?
        AND COALESCE(is_removed, 0) = 0
    `);
  } catch {
    return null;
  }
}
