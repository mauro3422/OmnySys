/**
 * @fileoverview Canonical system-map snapshot queries.
 *
 * Centralizes access to the mirrored `system_files` surface so higher-level
 * consumers do not embed raw SQL against the support table.
 *
 * @module query/queries/file-query/system-map
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { getSystemMapPersistenceCoverage } from '#shared/compiler/index.js';

function normalizeSystemPath(filePath = '') {
  return String(filePath || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

function parseJson(value, fallback) {
  if (value == null || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function mapSystemFileRow(row) {
  if (!row) {
    return null;
  }

  return {
    path: row.path,
    displayPath: row.display_path || row.path,
    culture: row.culture || null,
    cultureRole: row.culture_role || null,
    riskScore: Number(row.risk_score) || 0,
    semanticAnalysis: parseJson(row.semantic_analysis_json, {}),
    semanticConnections: parseJson(row.semantic_connections_json, []),
    exports: parseJson(row.exports_json, []),
    imports: parseJson(row.imports_json, []),
    definitions: parseJson(row.definitions_json, []),
    usedBy: parseJson(row.used_by_json, []),
    calls: parseJson(row.calls_json, []),
    identifierRefs: parseJson(row.identifier_refs_json, []),
    dependsOn: parseJson(row.depends_on_json, []),
    transitiveDepends: parseJson(row.transitive_depends_json, []),
    transitiveDependents: parseJson(row.transitive_dependents_json, []),
    isRemoved: Number(row.is_removed) || 0,
    updatedAt: row.updated_at || null
  };
}

function loadActiveSystemFileRows(db) {
  return db.prepare(`
    SELECT *
    FROM system_files
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();
}

export async function getSystemFileSnapshot(rootPath, filePath) {
  const normalizedPath = normalizeSystemPath(filePath);
  if (!rootPath || !normalizedPath) {
    return null;
  }

  const repo = getRepository(rootPath);
  if (!repo?.db) {
    return null;
  }

  const systemMapPersistenceCoverage = getSystemMapPersistenceCoverage(repo.db);

  const row = repo.db.prepare(`
    SELECT *
    FROM system_files
    WHERE path = ?
      AND (is_removed IS NULL OR is_removed = 0)
  `).get(normalizedPath);

  const snapshot = mapSystemFileRow(row);
  return snapshot ? {
    ...snapshot,
    systemMapPersistenceCoverage
  } : null;
}

export async function getSystemFilesSnapshot(rootPath) {
  if (!rootPath) {
    return [];
  }

  const repo = getRepository(rootPath);
  if (!repo?.db) {
    return [];
  }

  const systemMapPersistenceCoverage = getSystemMapPersistenceCoverage(repo.db);

  return loadActiveSystemFileRows(repo.db)
    .map(mapSystemFileRow)
    .filter(Boolean)
    .map((row) => ({
      ...row,
      systemMapPersistenceCoverage
    }));
}
