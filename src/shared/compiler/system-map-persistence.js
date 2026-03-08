/**
 * @fileoverview Canonical coverage helpers for persisted system-map tables.
 *
 * `system_files` and `file_dependencies` are support tables consumed by
 * queries/guards. They should be evaluated explicitly so the compiler can
 * tell the difference between "no data exists" and "the persistence bridge
 * is disconnected".
 *
 * @module shared/compiler/system-map-persistence
 */

import { toNumber } from './core-utils.js';

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function repairSystemMapPersistenceCoverage(db) {
  const rows = db.prepare(`
    SELECT path, depends_on_json
    FROM system_files
    WHERE (is_removed IS NULL OR is_removed = 0)
      AND depends_on_json IS NOT NULL
      AND depends_on_json != ''
      AND depends_on_json != '[]'
  `).all();

  if (!Array.isArray(rows) || rows.length === 0) {
    return { repaired: false, inserted: 0, sources: 0 };
  }

  const now = new Date().toISOString();
  const dependencies = [];

  for (const row of rows) {
    const sourcePath = String(row?.path || '').trim();
    if (!sourcePath) continue;

    for (const targetPath of parseJsonArray(row?.depends_on_json)) {
      const normalizedTargetPath = String(targetPath || '').trim();
      if (!normalizedTargetPath) continue;
      dependencies.push({
        sourcePath,
        targetPath: normalizedTargetPath,
        dependencyType: 'import',
        symbolsJson: '[]',
        reason: 'system_files.depends_on_json',
        isDynamic: 0,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  if (dependencies.length === 0) {
    return { repaired: false, inserted: 0, sources: 0 };
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
  })(dependencies);

  return {
    repaired: true,
    inserted: dependencies.length,
    sources: new Set(dependencies.map((dependency) => dependency.sourcePath)).size
  };
}

export function getSystemMapPersistenceCoverage(db) {
  const row = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM files) as filesTotal,
      (SELECT COUNT(*) FROM files WHERE imports_json IS NOT NULL AND imports_json != '' AND imports_json != '[]') as primaryFilesWithImports,
      (SELECT COUNT(*) FROM atoms WHERE is_phase2_complete = 0) as phase2PendingAtoms,
      (SELECT COUNT(DISTINCT file_path) FROM atoms) as liveAtomFiles,
      (SELECT COUNT(*) FROM system_files) as systemFilesTotal,
      (SELECT COUNT(*) FROM system_files WHERE imports_json IS NOT NULL AND imports_json != '' AND imports_json != '[]') as systemFilesWithImports,
      (SELECT COUNT(*) FROM file_dependencies) as fileDependenciesTotal,
      (SELECT COUNT(DISTINCT source_path) FROM file_dependencies) as dependencySourceFiles
  `).get() || {};

  const filesTotal = toNumber(row.filesTotal);
  const primaryFilesWithImports = toNumber(row.primaryFilesWithImports);
  const liveAtomFiles = toNumber(row.liveAtomFiles);
  const phase2PendingAtoms = toNumber(row.phase2PendingAtoms);
  const systemFilesTotal = toNumber(row.systemFilesTotal);
  const systemFilesWithImports = toNumber(row.systemFilesWithImports);
  const fileDependenciesTotal = toNumber(row.fileDependenciesTotal);
  const dependencySourceFiles = toNumber(row.dependencySourceFiles);
  const importBackedFileRatio = systemFilesTotal > 0
    ? Number((systemFilesWithImports / systemFilesTotal).toFixed(3))
    : 0;
  const mirroredImportCoverageRatio = primaryFilesWithImports > 0
    ? Number((systemFilesWithImports / primaryFilesWithImports).toFixed(3))
    : 0;
  const dependencySourceCoverageRatio = primaryFilesWithImports > 0
    ? Number((dependencySourceFiles / primaryFilesWithImports).toFixed(3))
    : 0;

  const issues = [];
  if (systemFilesTotal === 0 && filesTotal > 0) {
    issues.push('system_files is empty while files metadata exists');
  }
  if (fileDependenciesTotal === 0 && systemFilesWithImports > 0) {
    issues.push('file_dependencies is empty even though system_files contains import telemetry');
  }
  if (systemFilesTotal > 0 && liveAtomFiles > 0 && systemFilesTotal < Math.floor(liveAtomFiles * 0.9)) {
    issues.push('system_files lags behind the live atom file universe');
  }
  if (primaryFilesWithImports > 0 && mirroredImportCoverageRatio < 0.5) {
    issues.push('system_files import telemetry is much sparser than the primary files table');
  }
  if (primaryFilesWithImports > 0 && dependencySourceCoverageRatio < 0.5) {
    issues.push('file_dependencies covers too few source files compared with the primary files import universe');
  }

  return {
    filesTotal,
    primaryFilesWithImports,
    liveAtomFiles,
    phase2PendingAtoms,
    systemFilesTotal,
    systemFilesWithImports,
    fileDependenciesTotal,
    dependencySourceFiles,
    importBackedFileRatio,
    mirroredImportCoverageRatio,
    dependencySourceCoverageRatio,
    healthy: issues.length === 0,
    issues
  };
}

export function shouldTrustSystemMapDependencies(coverage = {}) {
  if (!coverage || coverage.healthy === false) {
    return false;
  }

  return toNumber(coverage.dependencySourceCoverageRatio) >= 0.5;
}
