/**
 * @fileoverview Canonical metadata extraction coverage helpers.
 *
 * Summarizes how much of the extracted metadata surface is populated in the
 * canonical DB tables without falling back to filesystem heuristics.
 *
 * @module shared/compiler/metadata-extraction-coverage
 */

import { toNumber } from './core-utils.js';
import { buildNoDatabaseCoverage, buildTableCoverage } from './metadata-extraction-coverage-helpers.js';

const METADATA_SURFACE_TABLES = [
  {
    table: 'atoms',
    label: 'Atom metadata surface',
    sourceOfTruth: 'atoms',
    fieldRules: {
      deprecated_reason: {
        eligibleWhen: 'COALESCE(is_deprecated, 0) = 1'
      }
    },
    excludedColumns: new Set([
      'id',
      'name',
      'atom_type',
      'file_path',
      'line_start',
      'line_end',
      'created_at',
      'updated_at',
      'is_removed',
      'lifecycle_status'
    ])
  },
  {
    table: 'files',
    label: 'File metadata surface',
    sourceOfTruth: 'files',
    excludedColumns: new Set([
      'path',
      'created_at',
      'updated_at',
      'is_removed'
    ])
  },
  {
    table: 'system_files',
    label: 'Mirrored file metadata surface',
    sourceOfTruth: 'system_files',
    excludedColumns: new Set([
      'path',
      'created_at',
      'updated_at',
      'is_removed'
    ])
  }
];

function collectMetadataCoverageTables(db) {
  return METADATA_SURFACE_TABLES.map((config) => buildTableCoverage(db, config));
}

function collectMetadataCoverageCounts(tables = []) {
  const totalTables = tables.length;
  const totalRows = tables.reduce((sum, table) => sum + toNumber(table.totalRows), 0);
  const totalFields = tables.reduce((sum, table) => sum + toNumber(table.totalFields), 0);
  const coveredFields = tables.reduce((sum, table) => sum + toNumber(table.coveredFields), 0);
  const emptyFields = tables.reduce((sum, table) => sum + toNumber(table.emptyFields), 0);
  const partialFields = tables.reduce((sum, table) => sum + toNumber(table.partialFields), 0);
  const fieldCoverageRatio = totalFields > 0 ? Number((coveredFields / totalFields).toFixed(3)) : 0;
  const rowCoverageRatio = totalFields > 0 && totalRows > 0
    ? Number((tables.reduce((sum, table) => sum + (toNumber(table.rowCoverageRatio) * toNumber(table.totalFields)), 0) / totalFields).toFixed(3))
    : 0;
  return {
    totalTables,
    totalRows,
    totalFields,
    coveredFields,
    emptyFields,
    partialFields,
    fieldCoverageRatio,
    rowCoverageRatio,
    coverageRatio: rowCoverageRatio,
    coveragePct: Math.round(rowCoverageRatio * 100),
    fieldCoveragePct: Math.round(fieldCoverageRatio * 100),
    trustworthy: totalFields > 0 && fieldCoverageRatio >= 0.5 && rowCoverageRatio >= 0.5,
    healthy: totalFields > 0 && fieldCoverageRatio >= 0.75 && rowCoverageRatio >= 0.75
  };
}

function collectMetadataCoverageFields(tables = []) {
  const flattenedFields = tables.flatMap((table) => table.fields);
  const applicableFields = flattenedFields.filter((field) => field.eligibleRows > 0 && field.state !== 'not_applicable');
  const sortedMissingFields = applicableFields
    .filter((field) => field.populatedRows === 0)
    .sort((a, b) => a.table.localeCompare(b.table) || a.field.localeCompare(b.field));
  const sortedCoveredFields = applicableFields
    .filter((field) => field.populatedRows > 0)
    .sort((a, b) => b.coverageRatio - a.coverageRatio || a.table.localeCompare(b.table) || a.field.localeCompare(b.field));
  const primaryIssue = sortedMissingFields[0] || applicableFields
    .filter((field) => field.populatedRows > 0)
    .sort((a, b) => a.coverageRatio - b.coverageRatio || a.table.localeCompare(b.table) || a.field.localeCompare(b.field))[0] || null;

  return {
    flattenedFields,
    sortedMissingFields,
    sortedCoveredFields,
    primaryIssue
  };
}

function buildMetadataCoverageSummary(counts, primaryIssue) {
  return {
    totalTables: counts.totalTables,
    totalRows: counts.totalRows,
    totalFields: counts.totalFields,
    coveredFields: counts.coveredFields,
    emptyFields: counts.emptyFields,
    partialFields: counts.partialFields,
    fieldCoverageRatio: counts.fieldCoverageRatio,
    rowCoverageRatio: counts.rowCoverageRatio,
    coverageRatio: counts.coverageRatio,
    coveragePct: counts.coveragePct,
    fieldCoveragePct: counts.fieldCoveragePct,
    nextAction: primaryIssue
      ? `Review ${primaryIssue.table}.${primaryIssue.field} before trusting downstream metadata consumers.`
      : counts.healthy
        ? 'Metadata extraction coverage is healthy enough to trust downstream consumers.'
        : 'Reconcile the missing metadata surfaces before trusting downstream consumers.'
  };
}

function buildMetadataCoverageReport(tables) {
  const counts = collectMetadataCoverageCounts(tables);
  const fieldLists = collectMetadataCoverageFields(tables);
  const warnings = [];
  const criticalFindings = [];

  if (counts.totalRows === 0) {
    criticalFindings.push({
      table: null,
      field: null,
      message: 'No canonical metadata rows were found in the tracked DB surfaces.'
    });
  } else if (counts.totalFields === 0) {
    criticalFindings.push({
      table: null,
      field: null,
      message: 'No metadata columns were tracked across atoms, files or system_files.'
    });
  } else if (counts.coveredFields === 0) {
    criticalFindings.push({
      table: null,
      field: null,
      message: 'Tracked metadata columns exist, but none are populated.'
    });
  } else if (!counts.healthy) {
    warnings.push({
      table: null,
      field: fieldLists.primaryIssue?.field || null,
      message: `Metadata extraction coverage is partial (${counts.fieldCoveragePct}% fields populated, ${counts.coveragePct}% weighted row coverage).`
    });
  }

  return {
    healthy: counts.healthy,
    trustworthy: counts.trustworthy,
    filesTotal: counts.totalRows,
    activeFiles: counts.coveredFields,
    primaryFilesWithImports: counts.coveredFields,
    liveAtomFiles: counts.totalTables,
    systemFilesTotal: counts.totalFields,
    systemFilesWithImports: counts.coveredFields,
    fileDependenciesTotal: counts.totalFields,
    dependencySourceFiles: counts.coveredFields,
    metrics: {
      activeAtoms: counts.totalRows,
      activeCallRelations: counts.coveredFields,
      activeSemanticConnections: counts.emptyFields
    },
    summary: buildMetadataCoverageSummary(counts, fieldLists.primaryIssue),
    tables,
    fields: fieldLists.flattenedFields,
    warnings,
    criticalFindings,
    primaryIssue: fieldLists.primaryIssue ? {
      table: fieldLists.primaryIssue.table,
      field: fieldLists.primaryIssue.field,
      type: fieldLists.primaryIssue.type,
      coverageRatio: fieldLists.primaryIssue.coverageRatio,
      coveragePct: fieldLists.primaryIssue.coveragePct,
      state: fieldLists.primaryIssue.state,
      reason: fieldLists.primaryIssue.reason
    } : null,
    topMissingFields: fieldLists.sortedMissingFields.slice(0, 10).map((field) => ({
      table: field.table,
      field: field.field,
      coveragePct: field.coveragePct,
      state: field.state
    })),
    topCoveredFields: fieldLists.sortedCoveredFields.slice(0, 10).map((field) => ({
      table: field.table,
      field: field.field,
      coveragePct: field.coveragePct,
      state: field.state
    }))
  };
}

export function getMetadataExtractionCoverage(db) {
  if (!db?.prepare) {
    return buildNoDatabaseCoverage();
  }

  return buildMetadataCoverageReport(collectMetadataCoverageTables(db));
}

export function summarizeMetadataExtractionCoverage(coverage = null) {
  if (!coverage || typeof coverage !== 'object') {
    return {
      totalTables: 0,
      totalRows: 0,
      totalFields: 0,
      coveredFields: 0,
      emptyFields: 0,
      partialFields: 0,
      fieldCoverageRatio: 0,
      rowCoverageRatio: 0,
      coverageRatio: 0,
      coveragePct: 0,
      fieldCoveragePct: 0,
      healthy: false,
      trustworthy: false,
      nextAction: 'No metadata extraction coverage is available.'
    };
  }

  return coverage.summary || {
    totalTables: 0,
    totalRows: 0,
    totalFields: 0,
    coveredFields: 0,
    emptyFields: 0,
    partialFields: 0,
    fieldCoverageRatio: 0,
    rowCoverageRatio: 0,
    coverageRatio: 0,
    coveragePct: 0,
    fieldCoveragePct: 0,
    healthy: false,
    trustworthy: false,
    nextAction: 'No metadata extraction coverage summary is available.'
  };
}

export default {
  getMetadataExtractionCoverage,
  summarizeMetadataExtractionCoverage
};
