/**
 * @fileoverview Canonical data-gateway contract for compiler surfaces.
 *
 * Centralizes freshness/trust evaluation for the DB-backed surfaces that feed
 * the compiler, status tools and repair paths. This is a policy layer, not a
 * new data source.
 *
 * @module shared/compiler/data-gateway-contract
 */

import { summarizeAnalysisGeneration } from './analysis-generation.js';
import {
  normalizeCount,
  normalizeFileImportEvidenceSurface,
  normalizePersistedFileCoverageSurface
} from './data-gateway-contract-helpers.js';

function normalizeText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function hasNonEmptyList(surface, key) {
  return Array.isArray(surface?.[key]) && surface[key].length > 0;
}

function hasAnyCoreCoverage(surface) {
  return (
    normalizeCount(surface?.filesTotal) > 0 ||
    normalizeCount(surface?.systemFilesTotal) > 0 ||
    normalizeCount(surface?.fileDependenciesTotal) > 0
  );
}

function hasCoreCoverageGaps(surface) {
  return (
    normalizeCount(surface?.fileDependenciesTotal) === 0 ||
    normalizeCount(surface?.systemFilesTotal) === 0 ||
    normalizeCount(surface?.activeFiles) === 0 ||
    normalizeCount(surface?.primaryFilesWithImports) === 0
  );
}

function scoreSurfaceState(surface = {}) {
  if (!surface || typeof surface !== 'object') {
    return 'missing';
  }

  if (surface.healthy === true) {
    return 'fresh';
  }

  if (hasNonEmptyList(surface, 'criticalFindings')) {
    return 'blocked';
  }

  if (surface.materiallyDrifting === true) {
    return 'stale';
  }

  if (!hasAnyCoreCoverage(surface)) {
    return 'missing';
  }

  if (hasNonEmptyList(surface, 'issues')) {
    return 'stale';
  }

  if (hasCoreCoverageGaps(surface)) {
    return 'missing';
  }

  if (hasNonEmptyList(surface, 'warnings')) {
    return 'partial';
  }

  return 'partial';
}

function buildSurfaceEntry({
  key,
  label,
  sourceOfTruth,
  surface,
  fallbackReason = 'Surface summary was not supplied.'
}) {
  const state = scoreSurfaceState(surface);
  const healthy = state === 'fresh';
  const trustworthy = state === 'fresh' || state === 'partial';
  const reason = normalizeText(
    surface?.summary ||
    surface?.recommendation ||
    surface?.issues?.[0] ||
    surface?.warnings?.[0]?.message ||
    fallbackReason,
    fallbackReason
  );

  return {
    key,
    label,
    sourceOfTruth,
    state,
    healthy,
    trustworthy,
    reason,
    evidence: surface || {},
    counts: {
      filesTotal: normalizeCount(surface?.filesTotal),
      activeFiles: normalizeCount(surface?.activeFiles),
      primaryFilesWithImports: normalizeCount(surface?.primaryFilesWithImports),
      liveAtomFiles: normalizeCount(surface?.liveAtomFiles),
      systemFilesTotal: normalizeCount(surface?.systemFilesTotal),
      systemFilesWithImports: normalizeCount(surface?.systemFilesWithImports),
      fileDependenciesTotal: normalizeCount(surface?.fileDependenciesTotal),
      dependencySourceFiles: normalizeCount(surface?.dependencySourceFiles),
      activeAtoms: normalizeCount(surface?.metrics?.activeAtoms),
      activeCallRelations: normalizeCount(surface?.metrics?.activeCallRelations),
      activeSemanticConnections: normalizeCount(surface?.metrics?.activeSemanticConnections)
    }
  };
}

function summarizeSurfaceEntries(entries = []) {
  const summary = {
    total: entries.length,
    fresh: 0,
    partial: 0,
    stale: 0,
    missing: 0,
    blocked: 0,
    trustworthy: true
  };

  for (const entry of entries) {
    summary[entry.state] = (summary[entry.state] || 0) + 1;
    if (entry.state !== 'fresh' && entry.state !== 'partial') {
      summary.trustworthy = false;
    }
  }

  summary.nextAction = summary.trustworthy
    ? 'All tracked surfaces are fresh enough to trust downstream reads.'
    : 'Reconcile the stale or missing surfaces before trusting downstream consumers.';

  return summary;
}

export function buildSurfaceFreshnessLedger({
  analysisGeneration = null,
  persistedFileCoverage = null,
  fileImportEvidenceCoverage = null,
  systemMapPersistenceCoverage = null,
  metadataSurfaceParity = null,
  semanticSurfaceGranularity = null,
  fileUniverseGranularity = null,
  databaseHealth = null
} = {}) {
  const analysisGenerationSummary = summarizeAnalysisGeneration(analysisGeneration);
  const normalizedPersistedFileCoverage = normalizePersistedFileCoverageSurface(persistedFileCoverage);
  const normalizedFileImportEvidenceCoverage = normalizeFileImportEvidenceSurface(fileImportEvidenceCoverage);
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

export function buildDataGatewayContract(options = {}) {
  return buildSurfaceFreshnessLedger(options);
}

export function summarizeDataGatewayContract(contract = null) {
  if (!contract || typeof contract !== 'object') {
    return {
      total: 0,
      fresh: 0,
      partial: 0,
      stale: 0,
      missing: 0,
      blocked: 0,
      trustworthy: false,
      nextAction: 'No data-gateway contract is available.'
    };
  }

  return summarizeSurfaceFreshnessLedger(contract);
}

export default {
  buildSurfaceFreshnessLedger,
  summarizeSurfaceFreshnessLedger,
  buildDataGatewayContract,
  summarizeDataGatewayContract
};
