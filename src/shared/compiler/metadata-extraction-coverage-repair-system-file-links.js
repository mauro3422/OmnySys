/**
 * @fileoverview Link-oriented system-file repair helpers.
 *
 * Keeps semantic analysis and transitive dependency backfills isolated from
 * the main system-file repair module so both files stay below watcher size
 * thresholds.
 *
 * @module shared/compiler/metadata-extraction-coverage-repair-system-file-links
 */

import { parsePersistedArray } from './core-utils.js';
import { getTableColumns, hasColumn, normalizeDbPath } from './metadata-extraction-coverage-repair-shared.js';

function buildSystemFileSemanticAnalysisByPath(db) {
  const atomColumns = getTableColumns(db, 'atoms');
  const hasSharedState = hasColumn(atomColumns, 'shared_state_json');
  const hasEmitters = hasColumn(atomColumns, 'event_emitters_json');
  const hasListeners = hasColumn(atomColumns, 'event_listeners_json');
  const hasScopeType = hasColumn(atomColumns, 'scope_type');

  if (!hasSharedState && !hasEmitters && !hasListeners && !hasScopeType) {
    return new Map();
  }

  const selectedColumns = ['file_path'];
  if (hasSharedState) selectedColumns.push('shared_state_json');
  if (hasEmitters) selectedColumns.push('event_emitters_json');
  if (hasListeners) selectedColumns.push('event_listeners_json');
  if (hasScopeType) selectedColumns.push('scope_type');

  const rows = db.prepare(`
    SELECT ${selectedColumns.join(', ')}
    FROM atoms
    WHERE (is_removed IS NULL OR is_removed = 0)
      AND (
        ${hasSharedState ? "COALESCE(shared_state_json, '') NOT IN ('', 'null', '[]')" : '1=0'}
        ${hasEmitters ? "OR COALESCE(event_emitters_json, '') NOT IN ('', 'null', '[]')" : ''}
        ${hasListeners ? "OR COALESCE(event_listeners_json, '') NOT IN ('', 'null', '[]')" : ''}
      )
  `).all();

  const grouped = new Map();

  for (const row of rows) {
    const filePath = normalizeDbPath(row?.file_path || '');
    if (!filePath) continue;

    const bucket = grouped.get(filePath) || {
      sharedStateAccess: [],
      eventEmitters: [],
      eventListeners: [],
      scopeTypes: new Set(),
      seen: new Set()
    };

    const addEntries = (entries, target) => {
      for (const entry of entries) {
        const key = typeof entry === 'string' ? entry : JSON.stringify(entry);
        if (!key || bucket.seen.has(`${target}:${key}`)) continue;
        bucket.seen.add(`${target}:${key}`);
        bucket[target].push(entry);
      }
    };

    if (hasSharedState) {
      addEntries(parsePersistedArray(row?.shared_state_json), 'sharedStateAccess');
    }
    if (hasEmitters) {
      addEntries(parsePersistedArray(row?.event_emitters_json), 'eventEmitters');
    }
    if (hasListeners) {
      addEntries(parsePersistedArray(row?.event_listeners_json), 'eventListeners');
    }

    const scopeType = hasScopeType ? String(row?.scope_type || '').trim() : '';
    if (scopeType) {
      bucket.scopeTypes.add(scopeType);
    }

    grouped.set(filePath, bucket);
  }

  return grouped;
}

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

export function backfillSystemFileSemanticAnalysis(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const updateSql = hasUpdatedAt
    ? `UPDATE system_files SET semantic_analysis_json = ?, updated_at = ? WHERE path = ? AND (semantic_analysis_json IS NULL OR semantic_analysis_json = '' OR semantic_analysis_json = '{}')`
    : `UPDATE system_files SET semantic_analysis_json = ? WHERE path = ? AND (semantic_analysis_json IS NULL OR semantic_analysis_json = '' OR semantic_analysis_json = '{}')`;
  const updateStmt = db.prepare(updateSql);

  const groupedAnalysis = buildSystemFileSemanticAnalysisByPath(db);
  if (groupedAnalysis.size === 0) {
    return 0;
  }

  let updated = 0;
  for (const [filePath, bucket] of groupedAnalysis.entries()) {
    const payload = JSON.stringify({
      sharedState: {
        reads: bucket.sharedStateAccess,
        writes: [],
        all: bucket.sharedStateAccess
      },
      eventPatterns: {
        eventEmitters: bucket.eventEmitters,
        eventListeners: bucket.eventListeners
      },
      sideEffects: {
        hasGlobalAccess: bucket.scopeTypes.has('global') || bucket.sharedStateAccess.length > 0,
        scopeTypes: [...bucket.scopeTypes]
      }
    });
    const result = hasUpdatedAt
      ? updateStmt.run(payload, nowIso, filePath)
      : updateStmt.run(payload, filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

export function backfillSystemFileTransitiveDependents(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const updateSql = hasUpdatedAt
    ? `UPDATE system_files SET transitive_dependents_json = ?, updated_at = ? WHERE path = ? AND (transitive_dependents_json IS NULL OR transitive_dependents_json = '' OR transitive_dependents_json = '[]')`
    : `UPDATE system_files SET transitive_dependents_json = ? WHERE path = ? AND (transitive_dependents_json IS NULL OR transitive_dependents_json = '' OR transitive_dependents_json = '[]')`;
  const updateStmt = db.prepare(updateSql);

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

    const result = hasUpdatedAt
      ? updateStmt.run(JSON.stringify(dependents), nowIso, filePath)
      : updateStmt.run(JSON.stringify(dependents), filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

export function backfillSystemFileTransitiveDepends(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const updateSql = hasUpdatedAt
    ? `UPDATE system_files SET transitive_depends_json = ?, updated_at = ? WHERE path = ? AND (transitive_depends_json IS NULL OR transitive_depends_json = '' OR transitive_depends_json = '[]')`
    : `UPDATE system_files SET transitive_depends_json = ? WHERE path = ? AND (transitive_depends_json IS NULL OR transitive_depends_json = '' OR transitive_depends_json = '[]')`;
  const updateStmt = db.prepare(updateSql);

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

    const result = hasUpdatedAt
      ? updateStmt.run(JSON.stringify(dependsOn), nowIso, filePath)
      : updateStmt.run(JSON.stringify(dependsOn), filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

