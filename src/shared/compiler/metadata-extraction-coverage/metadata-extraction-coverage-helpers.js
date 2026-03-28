/**
 * @fileoverview Low-level helpers for canonical metadata extraction coverage.
 *
 * Kept separate from the orchestration layer to keep the public helper focused
 * on DB aggregation and summary composition.
 *
 * @module shared/compiler/metadata-extraction-coverage-helpers
 */

export function buildNoDatabaseCoverage() {
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

export { buildFieldCoverageRow, buildTableCoverage } from '../metadata-extraction-coverage-table.js';
