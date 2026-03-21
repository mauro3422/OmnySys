/**
 * @fileoverview Canonical metadata extraction coverage helpers.
 *
 * Summarizes how much of the extracted metadata surface is populated in the
 * canonical DB tables without falling back to filesystem heuristics.
 *
 * @module shared/compiler/metadata-extraction-coverage
 */

import { toNumber } from './core-utils.js';
import { buildTableCoverage } from './metadata-extraction-coverage-helpers.js';

const METADATA_SURFACE_TABLES = [
  {
    table: 'atoms',
    label: 'Atom metadata surface',
    sourceOfTruth: 'atoms',
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

export function getMetadataExtractionCoverage(db) {
  if (!db?.prepare) {
    return {
      healthy: false,
      trustworthy: false,
      filesTotal: 0,
      activeFiles: 0,
      primaryFilesWithImports: 0,
      liveAtomFiles: 0,
      systemFilesTotal: 0,
      systemFilesWithImports: 0,
      fileDependenciesTotal: 0,
      dependencySourceFiles: 0,
      metrics: {
        activeAtoms: 0,
        activeCallRelations: 0,
        activeSemanticConnections: 0
      },
      summary: {
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
        nextAction: 'No metadata extraction coverage is available.'
      },
      tables: [],
      fields: [],
      warnings: [],
      criticalFindings: [
        {
          table: null,
          field: null,
          message: 'Repository database is not available for metadata extraction coverage.'
        }
      ],
      primaryIssue: {
        state: 'blocked',
        reason: 'Repository database is not available for metadata extraction coverage.'
      }
    };
  }

  const tables = METADATA_SURFACE_TABLES.map((config) => buildTableCoverage(db, config));

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
  const coverageRatio = rowCoverageRatio;
  const coveragePct = Math.round(coverageRatio * 100);
  const fieldCoveragePct = Math.round(fieldCoverageRatio * 100);
  const trustworthy = totalFields > 0 && fieldCoverageRatio >= 0.5 && rowCoverageRatio >= 0.5;
  const healthy = totalFields > 0 && fieldCoverageRatio >= 0.75 && rowCoverageRatio >= 0.75;

  const flattenedFields = tables.flatMap((table) => table.fields);
  const sortedMissingFields = flattenedFields
    .filter((field) => field.populatedRows === 0 && field.totalRows > 0)
    .sort((a, b) => a.table.localeCompare(b.table) || a.field.localeCompare(b.field));
  const sortedCoveredFields = flattenedFields
    .filter((field) => field.populatedRows > 0)
    .sort((a, b) => b.coverageRatio - a.coverageRatio || a.table.localeCompare(b.table) || a.field.localeCompare(b.field));
  const primaryIssue = sortedMissingFields[0] || flattenedFields
    .filter((field) => field.populatedRows > 0)
    .sort((a, b) => a.coverageRatio - b.coverageRatio || a.table.localeCompare(b.table) || a.field.localeCompare(b.field))[0] || null;

  const warnings = [];
  const criticalFindings = [];
  if (totalRows === 0) {
    criticalFindings.push({
      table: null,
      field: null,
      message: 'No canonical metadata rows were found in the tracked DB surfaces.'
    });
  } else if (totalFields === 0) {
    criticalFindings.push({
      table: null,
      field: null,
      message: 'No metadata columns were tracked across atoms, files or system_files.'
    });
  } else if (coveredFields === 0) {
    criticalFindings.push({
      table: null,
      field: null,
      message: 'Tracked metadata columns exist, but none are populated.'
    });
  } else if (!healthy) {
    warnings.push({
      table: null,
      field: primaryIssue?.field || null,
      message: `Metadata extraction coverage is partial (${fieldCoveragePct}% fields populated, ${coveragePct}% weighted row coverage).`
    });
  }

  const summary = {
    totalTables,
    totalRows,
    totalFields,
    coveredFields,
    emptyFields,
    partialFields,
    fieldCoverageRatio,
    rowCoverageRatio,
    coverageRatio,
    coveragePct,
    fieldCoveragePct,
    nextAction: primaryIssue
      ? `Review ${primaryIssue.table}.${primaryIssue.field} before trusting downstream metadata consumers.`
      : healthy
        ? 'Metadata extraction coverage is healthy enough to trust downstream consumers.'
        : 'Reconcile the missing metadata surfaces before trusting downstream consumers.'
  };

  return {
    healthy,
    trustworthy,
    filesTotal: totalRows,
    activeFiles: coveredFields,
    primaryFilesWithImports: coveredFields,
    liveAtomFiles: totalTables,
    systemFilesTotal: totalFields,
    systemFilesWithImports: coveredFields,
    fileDependenciesTotal: totalFields,
    dependencySourceFiles: coveredFields,
    metrics: {
      activeAtoms: totalRows,
      activeCallRelations: coveredFields,
      activeSemanticConnections: emptyFields
    },
    summary,
    tables,
    fields: flattenedFields,
    warnings,
    criticalFindings,
    primaryIssue: primaryIssue ? {
      table: primaryIssue.table,
      field: primaryIssue.field,
      type: primaryIssue.type,
      coverageRatio: primaryIssue.coverageRatio,
      coveragePct: primaryIssue.coveragePct,
      state: primaryIssue.state,
      reason: primaryIssue.reason
    } : null,
    topMissingFields: sortedMissingFields.slice(0, 10).map((field) => ({
      table: field.table,
      field: field.field,
      coveragePct: field.coveragePct,
      state: field.state
    })),
    topCoveredFields: sortedCoveredFields.slice(0, 10).map((field) => ({
      table: field.table,
      field: field.field,
      coveragePct: field.coveragePct,
      state: field.state
    }))
  };
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
