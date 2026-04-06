/**
 * @fileoverview Snapshot helpers for system-map persistence repair.
 *
 * Keeps persisted system-file snapshots isolated from the path/dependency
 * resolution helpers so each module stays below the watcher size threshold.
 *
 * @module shared/compiler/system-map-persistence-repair-helpers
 */

import { parsePersistedArray } from '../core-utils.js';

function safeParseObject(value, fallback = {}) {
  if (value == null || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function loadSystemFileSnapshots(db) {
  const rows = db.prepare(`
    SELECT *
    FROM system_files
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();

  const snapshots = new Map();

  for (const row of rows) {
    const pathKey = String(row?.path || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\.\//, '')
      .replace(/^\/+/, '');
    if (!pathKey) continue;

    snapshots.set(pathKey, {
      path: pathKey,
      displayPath: row.display_path || pathKey,
      culture: row.culture || null,
      cultureRole: row.culture_role || null,
      riskScore: Number(row.risk_score) || 0,
      semanticAnalysis: safeParseObject(row.semantic_analysis_json, {}),
      semanticConnections: parsePersistedArray(row.semantic_connections_json),
      exports: parsePersistedArray(row.exports_json),
      imports: parsePersistedArray(row.imports_json),
      definitions: parsePersistedArray(row.definitions_json),
      usedBy: parsePersistedArray(row.used_by_json),
      calls: parsePersistedArray(row.calls_json),
      identifierRefs: parsePersistedArray(row.identifier_refs_json),
      dependsOn: parsePersistedArray(row.depends_on_json),
      transitiveDepends: parsePersistedArray(row.transitive_depends_json),
      transitiveDependents: parsePersistedArray(row.transitive_dependents_json),
      isRemoved: Number(row.is_removed) || 0,
      updatedAt: row.updated_at || null
    });
  }

  return snapshots;
}
