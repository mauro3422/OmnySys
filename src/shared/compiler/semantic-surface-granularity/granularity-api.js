/**
 * @fileoverview Canonical Granularity API for semantic surface summary/detail comparisons.
 *
 * This API exposes the relationship between file-level semantic summaries
 * (semantic_connections) and atom-level semantic metadata details
 * (shared_state_json, event_emitters_json, event_listeners_json).
 *
 * It prevents MCP/query tools from comparing file-level semantic_connections
 * with atom semantic metadata directly, providing explicit comparison surfaces.
 *
 * @module shared/compiler/semantic-surface-granularity/granularity-api
 */

import {
  getSemanticSurfaceGranularity,
  summarizeSemanticCanonicality
} from '../semantic-surface-granularity-contract.js';

import {
  buildLegacyView,
  summarizeConnectionTypes
} from '../semantic-surface-granularity-view.js';

/**
 * Compares file-level summary counts with atom-level detail counts.
 */
function compareSummaryVsDetail(summaryView = {}, detailView = {}) {
  const summaryTotal = summaryView.total || 0;
  const detailTotal = detailView.total || 0;
  const delta = detailTotal - summaryTotal;
  const driftPct = summaryTotal > 0 ? Math.round((delta / summaryTotal) * 100) : 0;

  return {
    summaryTotal,
    detailTotal,
    delta,
    driftPct,
    isAligned: delta === 0,
    isDetailRicher: detailTotal > summaryTotal,
    isSummaryBloated: summaryTotal > detailTotal,
    trustLevel: delta === 0 ? 'trusted' : (Math.abs(driftPct) <= 10 ? 'advisory' : 'drift')
  };
}

/**
 * Explains why granularity drift exists between summary and detail surfaces.
 */
function explainGranularityDrift(comparison = {}) {
  const explanations = [];

  if (comparison.isAligned) {
    explanations.push('Summary and detail are aligned.');
    return explanations;
  }

  if (comparison.isDetailRicher) {
    explanations.push(
      `Atom-level detail has ${comparison.delta} more signals than file-level summary.`
    );
    explanations.push(
      'This is expected: atoms capture per-function semantic signals while summaries aggregate at file level.'
    );
    explanations.push(
      'Use atom-level detail for precise semantic analysis; summary for high-level overview.'
    );
  } else if (comparison.isSummaryBloated) {
    explanations.push(
      `File-level summary has ${Math.abs(comparison.delta)} more entries than atom-level detail.`
    );
    explanations.push(
      'This may indicate stale summary rows or missing atom analysis.'
    );
    explanations.push(
      'Recommendation: re-run atom analysis to refresh detail surface.'
    );
  }

  if (Math.abs(comparison.driftPct) > 20) {
    explanations.push(
      `Drift of ${comparison.driftPct}% exceeds advisory threshold (20%). Trust level: ${comparison.trustLevel}.`
    );
  }

  return explanations;
}

/**
 * Gets recommendation for which surface to trust based on drift state.
 */
function getGranularityRecommendation(contract = {}) {
  const status = contract.status || 'unknown';

  if (status === 'stable') {
    return {
      trustedSurface: 'summary',
      canUseDetail: true,
      reasoning: 'Both surfaces are aligned and trustworthy.',
      action: 'safe_to_compare'
    };
  }

  if (status === 'advisory_only') {
    return {
      trustedSurface: 'detail',
      canUseDetail: true,
      reasoning: 'Summary is advisory-only; use atom detail as source of truth.',
      action: 'prefer_detail'
    };
  }

  return {
    trustedSurface: 'detail',
    canUseDetail: true,
    reasoning: 'Summary is materially drifting; do not compare totals directly.',
    action: 'avoid_direct_comparison'
  };
}

/**
 * Checks if the file-level summary surface is trustworthy.
 */
function isSummaryTrustworthy(contract = {}) {
  return contract.trustworthy === true && contract.status === 'stable';
}

/**
 * Determines if atom-level detail should be preferred over file-level summary.
 */
function shouldUseAtomDetail(contract = {}) {
  return !isSummaryTrustworthy(contract) ||
    contract.requiresCanonicalAdapter === true ||
    contract.unsafeForTotalsComparison === true;
}

/**
 * Gets the most trusted surface for semantic analysis.
 */
function getTrustedSurface(context = {}) {
  const contract = context.contract || {};
  const useDetail = shouldUseAtomDetail(contract);

  return {
    primary: useDetail ? 'atom_detail' : 'file_summary',
    secondary: useDetail ? 'file_summary' : 'atom_detail',
    summaryTrustworthy: isSummaryTrustworthy(contract),
    detailTrustworthy: true,
    canCompare: contract.status === 'stable',
    warning: useDetail
      ? 'Do not compare summary totals with atom detail counts directly.'
      : null,
    recommendedAction: useDetail
      ? 'Use atom-level detail for precise analysis; summary for high-level overview.'
      : 'Both surfaces are aligned; either can be used.'
  };
}

/**
 * Builds canonical view from atom surface data.
 */
function buildCanonicalView(atomSurface) {
  const connections = atomSurface?.connections || [];
  return {
    rows: connections,
    sharedState: connections.filter((c) => c.type === 'sharedState'),
    eventEmitters: connections.filter((c) => c.type === 'eventEmitters'),
    eventListeners: connections.filter((c) => c.type === 'eventListeners'),
    envVars: connections.filter((c) => c.type === 'envVar'),
    total: connections.length,
    derivedFrom: 'atoms.semantic_metadata'
  };
}

/**
 * Main API factory - returns complete granularity API.
 * @param {object} db - BetterSQLite3 database instance
 * @returns {object} Complete granularity API
 */
export function getGranularityAPI(db) {
  const granularity = getSemanticSurfaceGranularity(db);
  const canonicality = summarizeSemanticCanonicality(granularity);
  const comparison = compareSummaryVsDetail(
    granularity.legacyView,
    granularity.atomLevel
  );
  const driftExplanation = explainGranularityDrift(comparison);
  const recommendation = getGranularityRecommendation(granularity.contract);
  const trust = getTrustedSurface(granularity);

  return {
    granularity,
    canonicality,
    legacyView: granularity.legacyView,
    canonicalView: buildCanonicalView(granularity.atomLevel),
    comparison,
    driftExplanation,
    recommendation,
    trust,
    isSummaryTrustworthy: () => isSummaryTrustworthy(granularity.contract),
    shouldUseAtomDetail: () => shouldUseAtomDetail(granularity.contract),
    summarizeConnectionTypes,
    summarizeSemanticCanonicality
  };
}
