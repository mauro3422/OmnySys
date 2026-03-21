/**
 * @fileoverview Dependency repair helpers for persisted system-map tables.
 *
 * Rebuilds `file_dependencies` from canonical `system_files.depends_on_json`
 * snapshots when the mirrored dependency table disappears or falls behind.
 *
 * @module shared/compiler/system-map-persistence-repair-dependencies
 */

import { parsePersistedArray } from './core-utils.js';
import { dedupeDependencies } from './system-map-persistence-repair-paths.js';

export function repairFromSystemFileDependsOn(db) {
  const rows = db.prepare(`
    SELECT path, depends_on_json
    FROM system_files
    WHERE (is_removed IS NULL OR is_removed = 0)
      AND depends_on_json IS NOT NULL
      AND depends_on_json != ''
      AND depends_on_json != '[]'
  `).all();

  if (!Array.isArray(rows) || rows.length === 0) {
    return { repaired: false, inserted: 0, sources: 0, dependencies: 0, rebuiltFrom: 'system_files' };
  }

  const nowIso = new Date().toISOString();
  const dependencies = [];

  for (const row of rows) {
    const sourcePath = String(row?.path || '').trim();
    if (!sourcePath) continue;

    for (const targetPath of parsePersistedArray(row?.depends_on_json)) {
      const normalizedTargetPath = String(targetPath || '').trim();
      if (!normalizedTargetPath) continue;
      dependencies.push({
        sourcePath,
        targetPath: normalizedTargetPath,
        dependencyType: 'import',
        symbolsJson: '[]',
        reason: 'system_files.depends_on_json',
        isDynamic: 0,
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }
  }

  const uniqueDependencies = dedupeDependencies(dependencies);

  if (uniqueDependencies.length === 0) {
    return { repaired: false, inserted: 0, sources: 0, dependencies: 0, rebuiltFrom: 'system_files' };
  }

  db.prepare('DELETE FROM file_dependencies').run();
  const insert = db.prepare(`
    INSERT INTO file_dependencies (
      source_path,
      target_path,
      dependency_type,
      symbols_json,
      reason,
      is_dynamic,
      is_removed,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);

  db.transaction((records) => {
    for (const record of records) {
      insert.run(
        record.sourcePath,
        record.targetPath,
        record.dependencyType,
        record.symbolsJson,
        record.reason,
        record.isDynamic,
        record.createdAt,
        record.updatedAt
      );
    }
  })(uniqueDependencies);

  return {
    repaired: true,
    inserted: uniqueDependencies.length,
    sources: new Set(uniqueDependencies.map((dependency) => dependency.sourcePath)).size,
    dependencies: uniqueDependencies.length,
    rebuiltFrom: 'system_files'
  };
}
