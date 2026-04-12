/**
 * @fileoverview Canonical API for semantic summary vs detail comparison.
 *
 * Exposes a stable contract for comparing file-level semantic summaries
 * (semantic_connections table) with atom-level semantic metadata
 * (atoms.semantic_surface), so downstream consumers understand these are
 * different granularities and should not be treated as equivalent totals.
 *
 * This is the canonical entry point that MCP/query tools should use instead
 * of comparing file-level semantic_connections directly with atom semantic
 * metadata.
 *
 * @module shared/compiler/semantic-granularity-api
 */

import { getSemanticSurfaceGranularity } from './semantic-surface-granularity-contract.js';
import { toRatio, asNumber } from './core-utils.js';

/**
 * Builds a canonical semantic granularity comparison signal.
 *
 * This is the primary API for consumers that need to understand the
 * relationship between file-level semantic summaries and atom-level
 * semantic details.
 *
 * @param {object} options
 * @param {import('better-sqlite3').Database} options.db - SQLite database instance
 * @param {object} options.compilerExplainability - Optional compiler explainability context
 * @param {string} options.source - Optional capture source for provenance
 * @returns {object} Canonical semantic granularity comparison
 */
export function buildSemanticGranularityComparison({
  db,
  compilerExplainability = null,
  source = 'semantic-granularity-api'
} = {}) {
  if (!db) {
    return buildEmptyGranularityComparison(source);
  }

  try {
    const granularity = getSemanticSurfaceGranularity(db);

    const fileLevelTotal = asNumber(granularity.fileLevel?.total, 0);
    const atomLevelTotal = asNumber(granularity.atomLevel?.total, 0);
    const contract = granularity.contract || {};

    // Build the canonical comparison signal
    const comparison = {
      // Source identification
      source,
      capturedAt: new Date().toISOString(),

      // Granularity levels (NOT equivalent - different surfaces)
      fileLevel: {
        total: fileLevelTotal,
        byType: granularity.fileLevel?.byType || {},
        surface: 'semantic_connections',
        description: 'Coarse file-level semantic summary'
      },
      atomLevel: {
        total: atomLevelTotal,
        sharedStateSignals: asNumber(granularity.atomLevel?.sharedStateSignals, 0),
        eventEmitterSignals: asNumber(granularity.atomLevel?.eventEmitterSignals, 0),
        eventListenerSignals: asNumber(granularity.atomLevel?.eventListenerSignals, 0),
        envVarSignals: asNumber(granularity.atomLevel?.envVarSignals, 0),
        atomsWithSharedState: asNumber(granularity.atomLevel?.atomsWithSharedState, 0),
        atomsWithEmitters: asNumber(granularity.atomLevel?.atomsWithEmitters, 0),
        atomsWithListeners: asNumber(granularity.atomLevel?.atomsWithListeners, 0),
        surface: 'atoms.semantic_metadata',
        description: 'Fine-grained atom-level semantic signals'
      },

      // Canonical contract guidance
      contract: {
        status: contract.status || 'unknown',
        trustworthy: contract.trustworthy !== false,
        recommendedSourceOfTruth: contract.recommendedSourceOfTruth || 'atoms',
        summarySurfaceAdvisory: contract.summarySurfaceAdvisory !== false,
        requiresCanonicalAdapter: contract.requiresCanonicalAdapter !== false,
        unsafeForTotalsComparison: contract.unsafeForTotalsComparison !== false,
        sharedStateGranularityRatio: contract.sharedStateGranularityRatio || toRatio(fileLevelTotal, atomLevelTotal),
        fileLevelSurface: contract.fileLevelSurface || 'semantic_connections',
        atomLevelSurface: contract.atomLevelSurface || 'atoms.semantic_metadata',
        summaryVsDetail: contract.summaryVsDetail !== false,
        equivalentTotals: contract.equivalentTotals === true
      },

      // Health and drift detection
      health: {
        healthy: granularity.healthy !== false,
        materiallyDrifting: granularity.materiallyDrifting === true,
        materialIssues: granularity.materialIssues || [],
        advisories: granularity.advisories || [],
        issueCount: asNumber(granularity.materialIssues?.length, 0),
        advisoryCount: asNumber(granularity.advisories?.length, 0)
      },

      // Canonical guidance for consumers
      guidance: buildGranularityGuidance(granularity),

      // Legacy views for backward compatibility (marked as deprecated)
      _legacyViews: {
        fileLevel: granularity.legacyView || null,
        persistedFileLevel: granularity.persistedLegacyView || null,
        canonicalAdapterDerivedFromAtoms: granularity.canonicalAdapterView || null,
        _deprecated: true,
        _warning: 'These views are for backward compatibility only. Use the canonical contract above.'
      }
    };

    return comparison;
  } catch (error) {
    return {
      source,
      capturedAt: new Date().toISOString(),
      error: error.message,
      healthy: false,
      fileLevel: { total: 0, surface: 'semantic_connections' },
      atomLevel: { total: 0, surface: 'atoms.semantic_metadata' },
      contract: {
        status: 'error',
        trustworthy: false,
        recommendedSourceOfTruth: 'atoms',
        unsafeForTotalsComparison: true
      },
      guidance: {
        summary: 'Error computing semantic granularity; default to atom-level metadata as source of truth.',
        recommendation: 'Check database health and retry. Atoms remain the canonical source of truth.'
      }
    };
  }
}

/**
 * Builds guidance message for consumers based on granularity state.
 */
function buildGranularityGuidance(granularity) {
  const contract = granularity.contract || {};
  const issues = granularity.materialIssues || [];
  const advisories = granularity.advisories || [];

  let summary = 'Semantic summary and detail surfaces are aligned.';
  let recommendation = 'Both file-level and atom-level surfaces can be used for their intended purposes.';

  if (granularity.materiallyDrifting) {
    summary = 'File-level semantic summary is materially drifting from atom-level truth.';
    recommendation = 'Use atom-level semantic_metadata as the source of truth. File-level summary should only be used as advisory.';
  } else if (contract.requiresCanonicalAdapter) {
    summary = 'File-level summary carries advisory warnings; atom-level metadata is preferred.';
    recommendation = 'Route semantic queries through the canonical adapter for accurate comparisons.';
  } else if (contract.unsafeForTotalsComparison) {
    summary = 'File-level and atom-level totals are not equivalent granularities.';
    recommendation = 'Do not compare file-level semantic_connections totals with atom-level totals directly.';
  }

  if (issues.length > 0 || advisories.length > 0) {
    summary += ` Issues: ${issues.length}, Advisories: ${advisories.length}.`;
  }

  return {
    summary,
    recommendation,
    hasMaterialIssues: issues.length > 0,
    hasAdvisories: advisories.length > 0,
    issueSummary: issues.length > 0 ? issues.join('; ') : null,
    advisorySummary: advisories.length > 0 ? advisories.join('; ') : null
  };
}

/**
 * Builds an empty granularity comparison for when DB is not available.
 */
function buildEmptyGranularityComparison(source) {
  return {
    source,
    capturedAt: new Date().toISOString(),
    fileLevel: {
      total: 0,
      byType: {},
      surface: 'semantic_connections',
      description: 'Coarse file-level semantic summary'
    },
    atomLevel: {
      total: 0,
      sharedStateSignals: 0,
      eventEmitterSignals: 0,
      eventListenerSignals: 0,
      envVarSignals: 0,
      atomsWithSharedState: 0,
      atomsWithEmitters: 0,
      atomsWithListeners: 0,
      surface: 'atoms.semantic_metadata',
      description: 'Fine-grained atom-level semantic signals'
    },
    contract: {
      status: 'unavailable',
      trustworthy: false,
      recommendedSourceOfTruth: 'atoms',
      summarySurfaceAdvisory: true,
      requiresCanonicalAdapter: true,
      unsafeForTotalsComparison: true,
      sharedStateGranularityRatio: 0,
      fileLevelSurface: 'semantic_connections',
      atomLevelSurface: 'atoms.semantic_metadata',
      summaryVsDetail: true,
      equivalentTotals: false
    },
    health: {
      healthy: false,
      materiallyDrifting: false,
      materialIssues: [],
      advisories: [],
      issueCount: 0,
      advisoryCount: 0
    },
    guidance: {
      summary: 'Database not available; cannot compute semantic granularity.',
      recommendation: 'Ensure database is healthy and retry. Atoms remain the canonical source of truth.',
      hasMaterialIssues: false,
      hasAdvisories: false,
      issueSummary: null,
      advisorySummary: null
    },
    _legacyViews: null
  };
}

/**
 * Summarizes the granularity comparison for inclusion in status panels.
 */
export function summarizeSemanticGranularity(comparison = null) {
  if (!comparison || typeof comparison !== 'object') {
    return null;
  }

  const contract = comparison.contract || {};
  const health = comparison.health || {};
  const guidance = comparison.guidance || {};

  return {
    state: health.materiallyDrifting ? 'drifting' : (contract.requiresCanonicalAdapter ? 'advisory' : 'aligned'),
    healthy: health.healthy === true,
    trustworthy: contract.trustworthy === true,
    fileLevelTotal: asNumber(comparison.fileLevel?.total, 0),
    atomLevelTotal: asNumber(comparison.atomLevel?.total, 0),
    hasMaterialIssues: health.hasMaterialIssues === true,
    hasAdvisories: health.hasAdvisories === true,
    issueCount: asNumber(health.issueCount, 0),
    advisoryCount: asNumber(health.advisoryCount, 0),
    unsafeForTotalsComparison: contract.unsafeForTotalsComparison !== false,
    recommendedSourceOfTruth: contract.recommendedSourceOfTruth || 'atoms',
    summary: guidance.summary || null,
    recommendation: guidance.recommendation || null
  };
}

export default {
  buildSemanticGranularityComparison,
  summarizeSemanticGranularity
};
