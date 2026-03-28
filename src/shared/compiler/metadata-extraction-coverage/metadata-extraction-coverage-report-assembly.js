import { collectMetadataCoverageCounts } from './metadata-extraction-coverage-report-counts.js';
import { collectMetadataCoverageFields } from './metadata-extraction-coverage-report-fields.js';
import { buildMetadataCoverageSummary } from './metadata-extraction-coverage-report-summary.js';

export function buildMetadataCoverageReport(tables) {
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
