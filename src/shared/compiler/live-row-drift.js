/**
 * @fileoverview Canonical helpers for reconciling live atom-backed files
 * against persisted support tables.
 *
 * @module shared/compiler/live-row-drift
 */

function toCount(row = {}, key = 'total') {
  return Number(row?.[key] || 0);
}

export function getLiveFileSetSql() {
  return `
    SELECT DISTINCT file_path
    FROM atoms
    WHERE file_path IS NOT NULL
      AND file_path != ''
  `;
}

export function getLiveFileTotal(db) {
  return toCount(
    db.prepare(`
      SELECT COUNT(DISTINCT file_path) as total
      FROM atoms
      WHERE file_path IS NOT NULL
        AND file_path != ''
    `).get()
  );
}

export function getStaleTableRowCount(db, tableName, fileColumn = 'file_path') {
  return toCount(
    db.prepare(`
      SELECT COUNT(*) as total
      FROM ${tableName}
      WHERE ${fileColumn} NOT IN (${getLiveFileSetSql()})
    `).get()
  );
}

export function getLiveRowDriftSummary(db) {
  const liveFileTotal = getLiveFileTotal(db);
  const staleFileRows = getStaleTableRowCount(db, 'files', 'path');
  const staleRiskRows = getStaleTableRowCount(db, 'risk_assessments', 'file_path');

  return {
    liveFileTotal,
    staleFileRows,
    staleRiskRows
  };
}

