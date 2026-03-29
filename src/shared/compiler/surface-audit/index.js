import { summarizeMetadataExtractionCoverage } from '../metadata-extraction-coverage/coverage.js';

export function compactSurfaceEntry(entry = {}) {
  return {
    key: entry.key || null,
    label: entry.label || null,
    state: entry.state || 'unknown',
    healthy: entry.healthy !== false,
    trustworthy: entry.trustworthy !== false,
    sourceOfTruth: entry.sourceOfTruth || null,
    reason: entry.reason || null,
    counts: entry.counts || {}
  };
}

export function normalizeMetadataSummary(metadataExtractionCoverage = null) {
  if (metadataExtractionCoverage && typeof metadataExtractionCoverage === 'object' && 'totalTables' in metadataExtractionCoverage) {
    return metadataExtractionCoverage;
  }

  return summarizeMetadataExtractionCoverage(metadataExtractionCoverage);
}

export function buildDatabaseMetricsSummary(databaseHealth = null) {
  const dbMetrics = databaseHealth?.metrics || {};
  return {
    activeAtoms: dbMetrics.activeAtoms || 0,
    activeFiles: dbMetrics.activeFiles || 0,
    activeCallRelations: dbMetrics.activeCallRelations || 0,
    activeSemanticConnections: dbMetrics.activeSemanticConnections || 0,
    orphanCallRelations: dbMetrics.orphanCallRelations || 0,
    activeSystemFiles: dbMetrics.activeSystemFiles || 0,
    systemFilesWithSemantics: dbMetrics.systemFilesWithSemantics || 0
  };
}

export function buildMetadataMetricsSummary(metadataSummary = null) {
  const summary = normalizeMetadataSummary(metadataSummary);
  return {
    metadataTables: summary.totalTables || summary.summary?.totalTables || 0,
    metadataRows: summary.totalRows || summary.summary?.totalRows || 0,
    metadataFields: summary.totalFields || summary.summary?.totalFields || 0,
    metadataCoveragePct: summary.coveragePct || summary.summary?.coveragePct || 0,
    metadataFieldCoveragePct: summary.fieldCoveragePct || summary.summary?.fieldCoveragePct || 0
  };
}

export function summarizeSurfaceMetrics({
  databaseHealth = null,
  metadataExtractionCoverage = null
} = {}) {
  return {
    ...buildDatabaseMetricsSummary(databaseHealth),
    ...buildMetadataMetricsSummary(metadataExtractionCoverage)
  };
}
