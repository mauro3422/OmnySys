/**
 * @fileoverview Canonical policy coverage summary for system inventory and propagation conformance.
 *
 * This is the "customs gate" view: it does not replace the inventory, it tells
 * us whether the current canonical surfaces, bridges, wrappers and reporting
 * surfaces are still surfacing the shared propagation/policy contract where
 * they are expected to do so.
 */

import { asNumber } from './core-utils.js';
import { clampScore, normalizeText } from '#shared/utils/normalize-helpers.js';

export function buildCompilerPolicyCoverageSummary({
  inventory = null,
  explainability = null,
  standardization = null
} = {}) {
  const summary = inventory?.summary || inventory || {};
  const policyDriftCount = asNumber(summary.policyDriftCount, 0);
  const missingCanonicalApiCount = asNumber(
    summary.missingCanonicalApiCount ?? standardization?.summary?.missingCanonicalApiCount,
    0
  );
  const missingCanonicalSurfaceCount = asNumber(
    summary.missingCanonicalSurfaceCount ?? standardization?.summary?.missingCanonicalSurfaceCount,
    0
  );
  const totalSystemCount = asNumber(summary.totalSystemCount, 0);
  const metadataCoveragePct = clampScore(summary.metadataCoveragePct);
  const integrationCoveragePct = clampScore(summary.integrationCoveragePct);
  const propagationExpansionState = normalizeText(summary.propagationExpansionState, null)
    || normalizeText(explainability?.driftAssessment?.signals?.find((signal) => signal?.key === 'propagation_expansion')?.state, null)
    || normalizeText(explainability?.driftAssessment?.primaryIssue?.state, null);
  const canonicalSurfaceCount = asNumber(summary.canonicalSurfaceCount, 0);
  const canonicalEntrypointCount = asNumber(summary.canonicalEntrypointCount, 0);
  const bridgeSystemCount = asNumber(summary.bridgeSystemCount, 0);
  const wrapperSystemCount = asNumber(summary.wrapperSystemCount, 0);
  const emergentSystemCount = asNumber(summary.emergentSystemCount, 0);
  const historyStoreState = normalizeText(summary.historyStoreState, null);
  const historyStoreCount = asNumber(summary.historyStoreCount, 0);
  const coverageLoad = canonicalSurfaceCount + canonicalEntrypointCount + bridgeSystemCount + wrapperSystemCount;

  // Normalize drift pressure: raw drift count would dwarf the score.
  // Use drift-per-system ratio scaled to 0-40 range (40 = 1 drift per system).
  const driftPerSystem = totalSystemCount > 0 ? policyDriftCount / totalSystemCount : 0;
  const normalizedDriftPressure = Math.min(Math.round(driftPerSystem * 40), 40);
  const canonicalGapPressure = Math.min(missingCanonicalApiCount + missingCanonicalSurfaceCount, 12);

  const signalPressure =
    (metadataCoveragePct > 0 && metadataCoveragePct < 80 ? 10 : 0) +
    (integrationCoveragePct > 0 && integrationCoveragePct < 80 ? 10 : 0);
  const driftPressure = normalizedDriftPressure
    + canonicalGapPressure
    + (propagationExpansionState === 'stale' ? 20 : 0)
    + signalPressure;
  const coverageScore = clampScore(100 - driftPressure);
  const coverageState = driftPressure > 0 ? (driftPressure >= 75 ? 'stale' : 'watching') : 'fresh';
  const nextAction = normalizeText(summary.nextAction, null)
    || 'Attach the canonical propagation plan to watcher, status, metrics and report surfaces before adding new local policy branches.';
  const signalSummary = [
    metadataCoveragePct ? `meta=${metadataCoveragePct}%` : null,
    integrationCoveragePct ? `integration=${integrationCoveragePct}%` : null,
    (missingCanonicalApiCount || missingCanonicalSurfaceCount)
      ? `canonical=${missingCanonicalApiCount}/${missingCanonicalSurfaceCount}`
      : null,
    historyStoreState ? `history=${historyStoreState}:${historyStoreCount}` : null
  ].filter(Boolean).join(' | ') || 'signals=unknown';

  return {
    policyDriftCount,
    propagationExpansionState,
    coverageState,
    coverageScore,
    totalSystemCount,
    canonicalSurfaceCount,
    canonicalEntrypointCount,
    bridgeSystemCount,
    wrapperSystemCount,
    emergentSystemCount,
    coverageLoad,
    coverageRatio: totalSystemCount > 0 ? Math.round((coverageLoad / totalSystemCount) * 100) / 100 : 0,
    missingCanonicalApiCount,
    missingCanonicalSurfaceCount,
    nextAction,
    recommendation: coverageState === 'fresh'
      ? 'Keep the canonical propagation contract attached to all status and reporting surfaces.'
      : 'Attach the canonical propagation plan or consume it from shared/compiler before emitting watcher, status or reporting payloads.',
    summaryText: `coverage=${coverageState} | score=${coverageScore} | load=${coverageLoad}/${totalSystemCount} | drift=${policyDriftCount} | canonical=${missingCanonicalApiCount}/${missingCanonicalSurfaceCount} | expansion=${propagationExpansionState || 'unknown'} | ${signalSummary}`,
    inventoryState: normalizeText(summary.inventoryState, null)
  };
}

export default {
  buildCompilerPolicyCoverageSummary
};
