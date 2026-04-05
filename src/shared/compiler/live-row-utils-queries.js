import { toCount } from './compiler-diagnostics.js';

function normalizeLimit(limit, fallback = 10) {
  const numeric = Number(limit);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback;
}

export function getLiveFileSetSql() {
  return `
    SELECT DISTINCT path AS file_path
    FROM files
    WHERE path IS NOT NULL
      AND path != ''
      AND (is_removed IS NULL OR is_removed = 0)
  `;
}

export function getLiveFileTotal(db) {
  return toCount(
    db.prepare(`
      SELECT COUNT(DISTINCT path) as total
      FROM files
      WHERE path IS NOT NULL
        AND path != ''
        AND (is_removed IS NULL OR is_removed = 0)
    `).get()?.total
  );
}

export function getStaleTableRowCount(db, tableName, fileColumn = 'file_path') {
  return toCount(
    db.prepare(`
      SELECT COUNT(*) as total
      FROM ${tableName}
      WHERE (is_removed IS NULL OR is_removed = 0)
        AND ${fileColumn} NOT IN (${getLiveFileSetSql()})
    `).get()?.total
  );
}

export function getStaleAtomRowCount(db) {
  return toCount(
    db.prepare(`
      SELECT COUNT(*) as total
      FROM atoms a
      LEFT JOIN files f ON a.file_path = f.path
      WHERE (a.is_removed IS NULL OR a.is_removed = 0)
        AND (f.path IS NULL OR f.is_removed = 1)
    `).get()?.total
  );
}

export function getLiveRowDriftSummary(db) {
  const liveFileTotal = getLiveFileTotal(db);
  const staleAtomRows = getStaleAtomRowCount(db);
  const staleFileRows = getStaleTableRowCount(db, 'files', 'path');
  const staleRiskRows = getStaleTableRowCount(db, 'risk_assessments', 'file_path');
  const staleRelationRows = toCount(
    db.prepare(`
      SELECT COUNT(*) as total
      FROM atom_relations ar
      LEFT JOIN atoms src ON ar.source_id = src.id
      LEFT JOIN atoms tgt ON ar.target_id = tgt.id
      WHERE ar.relation_type = 'calls'
        AND (ar.is_removed IS NULL OR ar.is_removed = 0)
        AND (
          src.id IS NULL OR src.is_removed = 1 OR
          tgt.id IS NULL OR tgt.is_removed = 1
        )
    `).get()?.total
  );
  const staleConnectionRows = toCount(
    db.prepare(`
      SELECT COUNT(*) as total
      FROM semantic_connections sc
      LEFT JOIN files src ON sc.source_path = src.path
      LEFT JOIN files tgt ON sc.target_path = tgt.path
      WHERE (sc.is_removed IS NULL OR sc.is_removed = 0)
        AND (
          src.path IS NULL OR src.is_removed = 1 OR
          tgt.path IS NULL OR tgt.is_removed = 1
        )
    `).get()?.total
  );

  return {
    liveFileTotal,
    staleAtomRows,
    staleFileRows,
    staleRiskRows,
    staleRelationRows,
    staleConnectionRows
  };
}

export function loadStaleTableRows(db, options = {}) {
  const {
    tableName,
    fileColumn = 'file_path',
    selectColumns = ['*'],
    limit = 10
  } = options;

  if (!tableName) throw new Error('tableName is required');

  const columns = Array.isArray(selectColumns) && selectColumns.length > 0
    ? selectColumns.join(', ')
    : '*';

  return db.prepare(`
    SELECT ${columns}
    FROM ${tableName}
    WHERE (is_removed IS NULL OR is_removed = 0)
      AND ${fileColumn} NOT IN (${getLiveFileSetSql()})
    LIMIT ?
  `).all(normalizeLimit(limit));
}
