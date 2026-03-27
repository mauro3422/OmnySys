/**
 * @fileoverview Transitive dependency backfill helpers for system-file repair links.
 *
 * @module shared/compiler/metadata-extraction-coverage-repair-system-file-links-dependencies
 */

import { getTableColumns, hasColumn, normalizeDbPath } from './metadata-extraction-coverage-repair-shared.js';
import { buildConditionalUpdateStatement, runConditionalUpdate } from './metadata-extraction-coverage-repair-updates.js';

function buildDependencyGraph(db) {
  const dependencyColumns = getTableColumns(db, 'file_dependencies');
  if (!Array.isArray(dependencyColumns) || dependencyColumns.length === 0) {
    return { forward: new Map(), reverse: new Map() };
  }

  const rows = db.prepare(`
    SELECT source_path, target_path
    FROM file_dependencies
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();

  const forward = new Map();
  const reverse = new Map();

  for (const row of rows) {
    const sourcePath = normalizeDbPath(row?.source_path || '');
    const targetPath = normalizeDbPath(row?.target_path || '');
    if (!sourcePath || !targetPath || sourcePath === targetPath) continue;

    const forwardBucket = forward.get(sourcePath) || new Set();
    forwardBucket.add(targetPath);
    forward.set(sourcePath, forwardBucket);

    const reverseBucket = reverse.get(targetPath) || new Set();
    reverseBucket.add(sourcePath);
    reverse.set(targetPath, reverseBucket);
  }

  return { forward, reverse };
}

function collectTransitivePaths(startPath, graph) {
  const normalizedStart = normalizeDbPath(startPath);
  if (!normalizedStart) return [];

  const visited = new Set();
  const queue = [...(graph.get(normalizedStart) || [])];

  while (queue.length > 0) {
    const current = normalizeDbPath(queue.shift() || '');
    if (!current || current === normalizedStart || visited.has(current)) {
      continue;
    }
    visited.add(current);
    const next = graph.get(current);
    if (next) {
      for (const item of next) {
        const normalized = normalizeDbPath(item || '');
        if (normalized && !visited.has(normalized)) {
          queue.push(normalized);
        }
      }
    }
  }

  return [...visited].sort();
}

export function backfillSystemFileTransitiveDependents(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const updateStmt = buildConditionalUpdateStatement(
    db,
    'system_files',
    'transitive_dependents_json',
    "transitive_dependents_json IS NULL OR transitive_dependents_json = '' OR transitive_dependents_json = '[]'",
    hasUpdatedAt
  );

  const { reverse } = buildDependencyGraph(db);
  const rows = db.prepare(`
    SELECT path
    FROM system_files
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();

  let updated = 0;
  for (const row of rows) {
    const filePath = normalizeDbPath(row?.path || '');
    if (!filePath) continue;

    const dependents = collectTransitivePaths(filePath, reverse);
    if (dependents.length === 0) {
      continue;
    }

    const result = runConditionalUpdate(updateStmt, hasUpdatedAt, JSON.stringify(dependents), nowIso, filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

export function backfillSystemFileTransitiveDepends(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const updateStmt = buildConditionalUpdateStatement(
    db,
    'system_files',
    'transitive_depends_json',
    "transitive_depends_json IS NULL OR transitive_depends_json = '' OR transitive_depends_json = '[]'",
    hasUpdatedAt
  );

  const { forward } = buildDependencyGraph(db);
  const rows = db.prepare(`
    SELECT path
    FROM system_files
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();

  let updated = 0;
  for (const row of rows) {
    const filePath = normalizeDbPath(row?.path || '');
    if (!filePath) continue;

    const dependsOn = collectTransitivePaths(filePath, forward);
    if (dependsOn.length === 0) {
      continue;
    }

    const result = runConditionalUpdate(updateStmt, hasUpdatedAt, JSON.stringify(dependsOn), nowIso, filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}
