/**
 * @fileoverview Semantic surface granularity contract helpers.
 *
 * @module shared/compiler/semantic-surface-granularity-contract
 */

import { toRatio } from './core-utils.js';
import {
  deriveSemanticConnectionsFromAtomSurface,
  loadAtomSemanticSurface,
  summarizeAtomSemanticSurface
} from './semantic-surface-derivation.js';
import {
  buildLegacyView,
  summarizeConnectionTypes
} from './semantic-surface-granularity-view.js';
import { requiresCanonicalSemanticNormalization } from './semantic-surface-granularity-legacy.js';

export function summarizeSemanticCanonicality(semanticSurfaceGranularity = null) {
  if (!semanticSurfaceGranularity) {
    return null;
  }

  const contract = semanticSurfaceGranularity.contract || {};
  return {
    status: contract.status || 'unknown',
    trustworthy: contract.trustworthy !== false,
    recommendedSourceOfTruth: contract.recommendedSourceOfTruth || 'atoms',
    summarySurfaceAdvisory: contract.summarySurfaceAdvisory !== false,
    requiresCanonicalAdapter: contract.requiresCanonicalAdapter !== false,
    unsafeForTotalsComparison: contract.unsafeForTotalsComparison !== false,
    materialIssueCount: semanticSurfaceGranularity.materialIssues?.length || 0,
    advisoryCount: semanticSurfaceGranularity.advisories?.length || 0,
    materialIssues: semanticSurfaceGranularity.materialIssues || [],
    advisories: semanticSurfaceGranularity.advisories || [],
    summary: semanticSurfaceGranularity.materiallyDrifting
      ? 'Semantic file-level summary is materially drifting; use atoms until repaired.'
      : contract.status === 'advisory_only'
        ? 'Semantic file-level summary is healthy as an advisory surface, but atoms remain the source of truth.'
        : 'Semantic summary and canonical adapter are aligned.'
  };
}

export function getSemanticSurfaceGranularity(db) {
  const persistedSemanticRows = db.prepare(`
    SELECT connection_type, source_path, target_path, connection_key, weight, context_json
    FROM semantic_connections
    WHERE is_removed IS NULL OR is_removed = 0
  `).all();

  const atomSurface = loadAtomSemanticSurface(db);
  const atomSurfaceSummary = summarizeAtomSemanticSurface(atomSurface);
  const canonicalSemanticRows = deriveSemanticConnectionsFromAtomSurface(atomSurface);
  const persistedLegacyView = buildLegacyView(persistedSemanticRows);
  const canonicalLegacyView = buildLegacyView(canonicalSemanticRows.rows);
  const semanticByType = summarizeConnectionTypes(persistedSemanticRows);

  const fileLevelTotal = persistedSemanticRows.length;
  const atomLevelTotal = atomSurfaceSummary.totalSignals;
  const sharedStateGranularityRatio = toRatio(fileLevelTotal, atomSurfaceSummary.sharedStateSignals);

  const materialIssues = [];
  const advisories = [];
  if (fileLevelTotal === 0 && atomLevelTotal > 0) {
    materialIssues.push('file-level semantic summary is empty while atom-level semantic signals exist');
  }
  if (persistedSemanticRows.some(requiresCanonicalSemanticNormalization)) {
    advisories.push('semantic_connections still exposes legacy connection_type buckets that should be normalized through the canonical adapter');
  }
  if (persistedLegacyView.total !== canonicalLegacyView.total) {
    materialIssues.push('semantic_connections summary count is drifting from the canonical adapter derived from atoms');
  }

  const issues = [...materialIssues, ...advisories];
  const materiallyDrifting = materialIssues.length > 0;
  const requiresCanonicalAdapter = advisories.length > 0 || materiallyDrifting;

  return {
    fileLevel: {
      total: fileLevelTotal,
      byType: semanticByType
    },
    atomLevel: {
      total: atomLevelTotal,
      sharedStateSignals: atomSurfaceSummary.sharedStateSignals,
      eventEmitterSignals: atomSurfaceSummary.eventEmitterSignals,
      eventListenerSignals: atomSurfaceSummary.eventListenerSignals,
      envVarSignals: atomSurfaceSummary.envVarSignals,
      atomsWithSharedState: atomSurfaceSummary.atomsWithSharedState,
      atomsWithEmitters: atomSurfaceSummary.atomsWithEmitters,
      atomsWithListeners: atomSurfaceSummary.atomsWithListeners
    },
    legacyView: canonicalLegacyView,
    persistedLegacyView,
    canonicalAdapterView: {
      ...canonicalLegacyView,
      derivedFrom: 'atoms.semantic_surface'
    },
    contract: {
      fileLevelSurface: 'semantic_connections',
      atomLevelSurface: 'atoms.semantic_metadata',
      summaryVsDetail: true,
      equivalentTotals: false,
      trustworthy: !materiallyDrifting,
      sharedStateGranularityRatio,
      status: materiallyDrifting ? 'drift' : (requiresCanonicalAdapter ? 'advisory_only' : 'stable'),
      recommendedSourceOfTruth: 'atoms',
      summarySurfaceAdvisory: true,
      unsafeForTotalsComparison: fileLevelTotal !== atomLevelTotal,
      requiresCanonicalAdapter
    },
    healthy: !materiallyDrifting,
    materiallyDrifting,
    materialIssues,
    advisories,
    issues
  };
}
