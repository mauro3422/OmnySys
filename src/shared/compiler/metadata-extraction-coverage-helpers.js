/**
 * @fileoverview Low-level helpers for canonical metadata extraction coverage.
 *
 * Kept separate from the orchestration layer to keep the public helper focused
 * on DB aggregation and summary composition.
 *
 * @module shared/compiler/metadata-extraction-coverage-helpers
 */

import { toNumber } from './core-utils.js';

function quoteIdentifier(identifier = '') {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function loadTableColumns(db, table) {
  const rows = db?.prepare ? db.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all() : [];
  return Array.isArray(rows) ? rows : [];
}

function buildActiveRowsWhereClause(columns = []) {
  const hasSoftDelete = columns.some((column) => column?.name === 'is_removed');
  return hasSoftDelete ? 'WHERE (is_removed IS NULL OR is_removed = 0)' : '';
}

function isMetadataColumn(config, columnName) {
  return !config.excludedColumns.has(columnName);
}

function buildPopulatedExpression(columnName) {
  const quoted = quoteIdentifier(columnName);
  return `CASE
    WHEN ${quoted} IS NULL THEN 0
    WHEN typeof(${quoted}) = 'text' AND trim(${quoted}) IN ('', 'null', '[]', '{}') THEN 0
    WHEN typeof(${quoted}) = 'blob' AND length(${quoted}) = 0 THEN 0
    ELSE 1
  END`;
}

function formatCoverageRatio(populatedRows, totalRows) {
  if (totalRows <= 0) return 0;
  return Number((populatedRows / totalRows).toFixed(3));
}

export function buildFieldCoverageRow({
  table,
  field,
  type,
  totalRows,
  populatedRows
}) {
  const coverageRatio = formatCoverageRatio(populatedRows, totalRows);
  return {
    table,
    field,
    type,
    totalRows,
    populatedRows,
    emptyRows: Math.max(0, totalRows - populatedRows),
    coverageRatio,
    coveragePct: totalRows > 0 ? Math.round(coverageRatio * 100) : 0,
    state: totalRows === 0
      ? 'missing'
      : populatedRows === 0
        ? 'empty'
        : coverageRatio >= 0.9
          ? 'covered'
    : 'partial'
  };
}

function buildTableFields(config, columns = [], row = {}, totalRows = 0) {
  const metadataColumns = columns.filter((column) => isMetadataColumn(config, String(column?.name || '')));

  return metadataColumns.map((column) => {
    const name = String(column.name || '');
    const populatedRows = toNumber(row[`${name}__populated`] || 0);
    return buildFieldCoverageRow({
      table: config.table,
      field: name,
      type: String(column.type || '').trim() || 'UNKNOWN',
      totalRows,
      populatedRows
    });
  });
}

function summarizeCoverageMetrics(fields = [], totalRows = 0) {
  const totalFields = fields.length;
  const coveredFields = fields.filter((field) => field.populatedRows > 0).length;
  const emptyFields = fields.filter((field) => field.populatedRows === 0).length;
  const partialFields = fields.filter((field) => field.populatedRows > 0 && field.coverageRatio < 0.9).length;
  const rowCoverageRatio = totalRows > 0 && totalFields > 0
    ? Number((fields.reduce((sum, field) => sum + field.populatedRows, 0) / (totalRows * totalFields)).toFixed(3))
    : 0;
  const fieldCoverageRatio = totalFields > 0 ? Number((coveredFields / totalFields).toFixed(3)) : 0;

  return {
    totalFields,
    coveredFields,
    emptyFields,
    partialFields,
    rowCoverageRatio,
    fieldCoverageRatio,
    healthy: totalRows > 0 && totalFields > 0 && fieldCoverageRatio >= 0.75 && rowCoverageRatio >= 0.75,
    trustworthy: totalRows > 0 && totalFields > 0 && fieldCoverageRatio >= 0.5 && rowCoverageRatio >= 0.5
  };
}

function summarizeCoverageIssues(config, fields = [], totalRows = 0, metrics = {}) {
  const sortedMissingFields = [...fields]
    .filter((field) => field.populatedRows === 0 && totalRows > 0)
    .sort((a, b) => a.field.localeCompare(b.field));
  const sortedCoveredFields = [...fields]
    .filter((field) => field.populatedRows > 0)
    .sort((a, b) => b.coverageRatio - a.coverageRatio || a.field.localeCompare(b.field));

  const primaryIssue = sortedMissingFields[0] || [...fields]
    .filter((field) => field.populatedRows > 0)
    .sort((a, b) => a.coverageRatio - b.coverageRatio || a.field.localeCompare(b.field))[0] || null;

  const warnings = [];
  const criticalFindings = [];
  if (totalRows === 0) {
    criticalFindings.push({
      table: config.table,
      field: null,
      message: `No live rows are available for ${config.table}; coverage cannot be evaluated.`
    });
  } else if ((metrics.totalFields || 0) === 0) {
    criticalFindings.push({
      table: config.table,
      field: null,
      message: `No metadata columns were tracked for ${config.table}; coverage cannot be evaluated.`
    });
  } else if ((metrics.coveredFields || 0) === 0) {
    criticalFindings.push({
      table: config.table,
      field: null,
      message: `${config.table} has live rows but none of the tracked metadata columns are populated.`
    });
  } else if (metrics.healthy === false) {
    warnings.push({
      table: config.table,
      field: primaryIssue?.field || null,
      message: `${config.table} metadata coverage is partial (${Math.round((metrics.fieldCoverageRatio || 0) * 100)}% fields populated, ${Math.round((metrics.rowCoverageRatio || 0) * 100)}% average row coverage).`
    });
  }

  return {
    warnings,
    criticalFindings,
    primaryIssue: primaryIssue ? {
      table: config.table,
      field: primaryIssue.field,
      type: primaryIssue.type,
      coverageRatio: primaryIssue.coverageRatio,
      coveragePct: primaryIssue.coveragePct,
      state: primaryIssue.state,
      reason: primaryIssue.populatedRows === 0
        ? `${config.table}.${primaryIssue.field} is empty`
        : `${config.table}.${primaryIssue.field} is only partially populated`
    } : null,
    topMissingFields: sortedMissingFields.slice(0, 10).map((field) => ({
      field: field.field,
      coveragePct: field.coveragePct,
      state: field.state
    })),
    topCoveredFields: sortedCoveredFields.slice(0, 10).map((field) => ({
      field: field.field,
      coveragePct: field.coveragePct,
      state: field.state
    }))
  };
}

export function buildTableCoverage(db, config) {
  const columns = loadTableColumns(db, config.table);
  const activeWhereClause = buildActiveRowsWhereClause(columns);
  const metadataColumns = columns.filter((column) => isMetadataColumn(config, String(column?.name || '')));

  const selectParts = ['COUNT(*) as totalRows'];
  for (const column of metadataColumns) {
    const name = String(column.name || '');
    selectParts.push(`${buildPopulatedExpression(name)} AS ${quoteIdentifier(`${name}__populated`)}`);
  }

  const row = db.prepare(`
    SELECT ${selectParts.join(', ')}
    FROM ${quoteIdentifier(config.table)}
    ${activeWhereClause}
  `).get() || {};

  const totalRows = toNumber(row.totalRows);
  const fields = buildTableFields(config, columns, row, totalRows);
  const metrics = summarizeCoverageMetrics(fields, totalRows);
  const issues = summarizeCoverageIssues(config, fields, totalRows, metrics);

  return {
    table: config.table,
    label: config.label,
    sourceOfTruth: config.sourceOfTruth,
    totalRows,
    ...metrics,
    coverageRatio: metrics.rowCoverageRatio,
    coveragePct: Math.round(metrics.rowCoverageRatio * 100),
    fieldCoveragePct: Math.round(metrics.fieldCoverageRatio * 100),
    ...issues,
    fields
  };
}
