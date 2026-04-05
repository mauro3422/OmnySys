/**
 * @fileoverview Canonical policy coverage summary for system inventory and propagation conformance.
 *
 * This is the "customs gate" view: it does not replace the inventory, it tells
 * us whether the current canonical surfaces, bridges, wrappers and reporting
 * surfaces are still surfacing the shared propagation/policy contract where
 * they are expected to do so.
 */

import { asNumber } from './core-utils.js';

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(asNumber(value, 0))));
}

function normalizeText(value, fallback = null) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return fallback;
}

export function buildCompilerPolicyCoverageSummary({
  inventory = null,
  explainability = null
} = {}) {
  const summary = inventory?.summary || inventory || {};
  const policyDriftCount = asNumber(summary.policyDriftCount, 0);
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
  const coverageLoad = canonicalSurfaceCount + canonicalEntrypointCount + bridgeSystemCount + wrapperSystemCount;

  // Normalize drift pressure: raw drift count would dwarf the score.
  // Use drift-per-system ratio scaled to 0-40 range (40 = 1 drift per system).
  const driftPerSystem = totalSystemCount > 0 ? policyDriftCount / totalSystemCount : 0;
  const normalizedDriftPressure = Math.min(Math.round(driftPerSystem * 40), 40);

  const signalPressure =
    (metadataCoveragePct > 0 && metadataCoveragePct < 80 ? 10 : 0) +
    (integrationCoveragePct > 0 && integrationCoveragePct < 80 ? 10 : 0);
  const driftPressure = normalizedDriftPressure
    + (propagationExpansionState === 'stale' ? 20 : 0)
    + signalPressure;
  const coverageScore = clampScore(100 - driftPressure);
  const coverageState = driftPressure > 0 ? (driftPressure >= 75 ? 'stale' : 'watching') : 'fresh';
  const nextAction = normalizeText(summary.nextAction, null)
    || 'Attach the canonical propagation plan to watcher, status, metrics and report surfaces before adding new local policy branches.';
  const signalSummary = [
    metadataCoveragePct ? `meta=${metadataCoveragePct}%` : null,
    integrationCoveragePct ? `integration=${integrationCoveragePct}%` : null
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
    nextAction,
    recommendation: coverageState === 'fresh'
      ? 'Keep the canonical propagation contract attached to all status and reporting surfaces.'
      : 'Attach the canonical propagation plan or consume it from shared/compiler before emitting watcher, status or reporting payloads.',
    summaryText: `coverage=${coverageState} | score=${coverageScore} | load=${coverageLoad}/${totalSystemCount} | drift=${policyDriftCount} | expansion=${propagationExpansionState || 'unknown'} | ${signalSummary}`,
    inventoryState: normalizeText(summary.inventoryState, null)
  };
}

export default {
  buildCompilerPolicyCoverageSummary
};
