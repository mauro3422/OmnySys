import { summarizeAnalysisGeneration } from './analysis-generation.js';
import { summarizeMetadataExtractionCoverage } from './metadata-extraction-coverage/metadata-extraction-coverage.js';
import {
  buildSurfaceEntry,
  summarizeSurfaceEntries,
  normalizeFileImportEvidenceSurface,
  normalizePersistedFileCoverageSurface
} from './data-gateway-contract-helpers.js';

export function buildSurfaceFreshnessLedger({
  analysisGeneration = null,
  persistedFileCoverage = null,
  fileImportEvidenceCoverage = null,
  systemMapPersistenceCoverage = null,
  metadataSurfaceParity = null,
  metadataExtractionCoverage = null,
  semanticSurfaceGranularity = null,
  fileUniverseGranularity = null,
  databaseHealth = null
} = {}) {
  const analysisGenerationSummary = summarizeAnalysisGeneration(analysisGeneration);
  const normalizedPersistedFileCoverage = normalizePersistedFileCoverageSurface(persistedFileCoverage);
  const normalizedFileImportEvidenceCoverage = normalizeFileImportEvidenceSurface(fileImportEvidenceCoverage);
  const normalizedMetadataExtractionCoverage = summarizeMetadataExtractionCoverage(metadataExtractionCoverage);
  const surfaces = [
    buildSurfaceEntry({
      key: 'analysis_generation',
      label: 'Analysis generation',
      sourceOfTruth: 'analysis generation snapshot',
      surface: analysisGenerationSummary,
      fallbackReason: 'No canonical analysis generation snapshot was supplied.'
    }),
    buildSurfaceEntry({
      key: 'persisted_file_coverage',
      label: 'Persisted file coverage',
      sourceOfTruth: 'compiler_scanned_files',
      surface: normalizedPersistedFileCoverage,
      fallbackReason: 'Persisted scanned-file coverage was not supplied.'
    }),
    buildSurfaceEntry({
      key: 'file_import_evidence',
      label: 'File import evidence',
      sourceOfTruth: 'files.imports_json',
      surface: normalizedFileImportEvidenceCoverage,
      fallbackReason: 'File import evidence coverage was not supplied.'
    }),
    buildSurfaceEntry({
      key: 'system_map_persistence',
      label: 'System map persistence',
      sourceOfTruth: 'atom_relations',
      surface: systemMapPersistenceCoverage,
      fallbackReason: 'System-map persistence coverage was not supplied.'
    }),
    buildSurfaceEntry({
      key: 'metadata_surface_parity',
      label: 'Metadata surface parity',
      sourceOfTruth: 'files + system_files',
      surface: metadataSurfaceParity,
      fallbackReason: 'Metadata surface parity was not supplied.'
    }),
    buildSurfaceEntry({
      key: 'metadata_extraction_coverage',
      label: 'Metadata extraction coverage',
      sourceOfTruth: 'atoms + files + system_files',
      surface: metadataExtractionCoverage,
      fallbackReason: 'Metadata extraction coverage was not supplied.'
    }),
    buildSurfaceEntry({
      key: 'semantic_surface_granularity',
      label: 'Semantic surface granularity',
      sourceOfTruth: 'atoms.semantic_metadata',
      surface: semanticSurfaceGranularity,
      fallbackReason: 'Semantic surface granularity was not supplied.'
    }),
    buildSurfaceEntry({
      key: 'file_universe_granularity',
      label: 'File universe granularity',
      sourceOfTruth: 'compiler_scanned_files + live files',
      surface: fileUniverseGranularity,
      fallbackReason: 'File universe granularity was not supplied.'
    }),
    buildSurfaceEntry({
      key: 'database_health',
      label: 'Database health',
      sourceOfTruth: 'atom_relations',
      surface: databaseHealth,
      fallbackReason: 'Database health summary was not supplied.'
    })
  ];

  const summary = summarizeSurfaceEntries(surfaces);
  const staleSurfaces = surfaces.filter((surface) => surface.state === 'stale' || surface.state === 'missing' || surface.state === 'blocked');
  const firstIssue = staleSurfaces[0] || surfaces.find((surface) => surface.state === 'partial') || null;

  return {
    contract: {
      sourceOfTruth: 'atoms',
      mirrorSurfaces: ['system_files', 'file_dependencies', 'semantic_connections'],
      policySurface: 'data-gateway-contract',
      recommendedSourceOfTruth: 'atoms'
    },
    generation: analysisGenerationSummary,
    metadataExtractionCoverage: normalizedMetadataExtractionCoverage,
    surfaces,
    summary: {
      ...summary,
      nextAction: firstIssue
        ? `Review ${firstIssue.label.toLowerCase()} before trusting downstream reads.`
        : summary.nextAction,
      primaryIssue: firstIssue ? {
        key: firstIssue.key,
        state: firstIssue.state,
        reason: firstIssue.reason
      } : null
    }
  };
}

export function summarizeSurfaceFreshnessLedger(ledger = null) {
  if (!ledger || typeof ledger !== 'object') {
    return {
      total: 0,
      fresh: 0,
      partial: 0,
      stale: 0,
      missing: 0,
      blocked: 0,
      trustworthy: false,
      nextAction: 'No freshness ledger is available.'
    };
  }

  return ledger.summary || {
    total: 0,
    fresh: 0,
    partial: 0,
    stale: 0,
    missing: 0,
    blocked: 0,
    trustworthy: false,
    nextAction: 'No freshness ledger summary is available.'
  };
}
