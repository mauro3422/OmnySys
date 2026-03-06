/**
 * @fileoverview Canonical planning helpers for reconciling stale support-table
 * rows against the live atom-backed file graph.
 *
 * @module shared/compiler/live-row-reconciliation
 */

import {
  getLiveFileSetSql,
  getLiveRowDriftSummary
} from './live-row-drift.js';

function normalizeLimit(limit, fallback = 10) {
  const numeric = Number(limit);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback;
}

export function loadStaleTableRows(db, options = {}) {
  const {
    tableName,
    fileColumn = 'file_path',
    selectColumns = ['*'],
    limit = 10
  } = options;

  if (!tableName) {
    throw new Error('tableName is required');
  }

  const columns = Array.isArray(selectColumns) && selectColumns.length > 0
    ? selectColumns.join(', ')
    : '*';

  return db.prepare(`
    SELECT ${columns}
    FROM ${tableName}
    WHERE ${fileColumn} NOT IN (${getLiveFileSetSql()})
    LIMIT ?
  `).all(normalizeLimit(limit));
}

export function buildLiveRowReconciliationPlan(db, options = {}) {
  const sampleLimit = normalizeLimit(options.sampleLimit, 10);
  const driftSummary = getLiveRowDriftSummary(db);

  return {
    summary: driftSummary,
    staleFileSamples: loadStaleTableRows(db, {
      tableName: 'files',
      fileColumn: 'path',
      selectColumns: ['path', 'atom_count', 'last_analyzed', 'hash'],
      limit: sampleLimit
    }),
    staleRiskSamples: loadStaleTableRows(db, {
      tableName: 'risk_assessments',
      fileColumn: 'file_path',
      selectColumns: ['file_path', 'risk_score', 'risk_level', 'assessed_at'],
      limit: sampleLimit
    }),
    recommendedActions: [
      'Reconcile stale files rows against the live atom graph before trusting support-table counts.',
      'Drop or archive stale risk rows once the owning file is no longer present in atoms.',
      'Prefer live atom-backed counts for compiler telemetry while cleanup remains pending.'
    ]
  };
}
