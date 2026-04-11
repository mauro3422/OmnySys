import { asNumber } from './core-utils.js';
import {
  isBlockedState,
  isDriftingState,
  isWatchingState
} from './signal-state-helpers.js';
import { buildMetricAlignmentSignal } from './metric-alignment-summary.js';

export function buildGapEntries({
  systemInventory,
  compilerExplainability,
  telemetry,
  propagation,
  signals,
  metricAlignment = null,
  current = null
}) {
  const summary = systemInventory?.summary || {};
  const policyDriftCount = asNumber(
    summary.policyDriftCount
      || summary.policyCoverageDriftCount
      || systemInventory?.policyDriftCount
      || systemInventory?.policyCoverageDriftCount,
    0
  );
  const missingCanonicalApiCount = asNumber(summary.missingCanonicalApiCount || systemInventory?.missingCanonicalApiCount, 0);
  const missingCanonicalSurfaceCount = asNumber(summary.missingCanonicalSurfaceCount || systemInventory?.missingCanonicalSurfaceCount, 0);
  const preferredAlignment = metricAlignment || buildMetricAlignmentSignal({
    compilerExplainability,
    systemInventory,
    current
  });
  const metadataCoveragePct = asNumber(
    compilerExplainability?.metadataExtractionCoverage?.summary?.fieldCoveragePct
      ?? summary.metadataCoveragePct
      ?? systemInventory?.metadataCoveragePct
      ?? compilerExplainability?.metadataExtractionCoverage?.summary?.coveragePct
      ?? 0,
    0
  );
  const databaseHealthy = compilerExplainability?.databaseHealth?.healthy === true;
  const gaps = [];

  if (preferredAlignment.state && preferredAlignment.state !== 'aligned') {
    gaps.push({
      key: 'metric_alignment',
      state: preferredAlignment.state === 'blocked' ? 'blocked' : preferredAlignment.state === 'drifting' ? 'stale' : 'watching',
      severity: preferredAlignment.state === 'blocked' ? 'critical' : preferredAlignment.state === 'drifting' ? 'high' : 'medium',
      count: preferredAlignment.coverage?.driftPct || preferredAlignment.coverage?.weightedDriftPct || 1,
      reason: preferredAlignment.reason,
      recommendation: preferredAlignment.recommendation
    });
  }

  if (policyDriftCount > 0) {
    gaps.push({
      key: 'policy_drift',
      state: policyDriftCount >= 10 ? 'blocked' : policyDriftCount >= 3 ? 'stale' : 'watching',
      severity: policyDriftCount >= 10 ? 'critical' : policyDriftCount >= 3 ? 'medium' : 'low',
      count: policyDriftCount,
      reason: `${policyDriftCount} active policy drift finding(s) remain in the control plane.`,
      recommendation: systemInventory?.policyCoverage?.nextAction || 'Resolve policy drift before trusting new surfaces.'
    });
  }

  if (missingCanonicalApiCount > 0 || missingCanonicalSurfaceCount > 0) {
    const total = missingCanonicalApiCount + missingCanonicalSurfaceCount;
    gaps.push({
      key: 'canonical_gaps',
      state: total >= 3 ? 'stale' : 'watching',
      severity: total >= 3 ? 'high' : 'medium',
      count: total,
      reason: `${missingCanonicalApiCount} canonical API gap(s) and ${missingCanonicalSurfaceCount} canonical surface gap(s) remain open.`,
      recommendation: systemInventory?.nextAction || 'Promote the missing canonical surfaces before adding more wrappers.'
    });
  }

  if (propagation.missingSystemCount > 0) {
    gaps.push({
      key: 'propagation_adoption',
      state: propagation.missingSystemCount >= 3 ? 'blocked' : 'stale',
      severity: propagation.missingSystemCount >= 3 ? 'critical' : 'high',
      count: propagation.missingSystemCount,
      reason: propagation.reason,
      recommendation: propagation.recommendation
    });
  }

  if (telemetry.requiredMissingCount > 0 || telemetry.blockedCount > 0) {
    gaps.push({
      key: 'telemetry_obligations',
      state: telemetry.blockedCount > 0 ? 'blocked' : 'stale',
      severity: telemetry.blockedCount > 0 ? 'critical' : 'high',
      count: telemetry.requiredMissingCount + telemetry.blockedCount,
      reason: telemetry.reason,
      recommendation: telemetry.nextAction
    });
  }

  if (metadataCoveragePct < 95) {
    gaps.push({
      key: 'metadata_coverage',
      state: metadataCoveragePct >= 85 ? 'watching' : 'stale',
      severity: metadataCoveragePct >= 85 ? 'medium' : 'high',
      count: 95 - metadataCoveragePct,
      reason: `Metadata extraction coverage is ${metadataCoveragePct}%.`,
      recommendation: 'Raise metadata extraction coverage so registry and inventory surfaces stay trustworthy.'
    });
  }

  if (!databaseHealthy && compilerExplainability?.databaseHealth) {
    gaps.push({
      key: 'database_health',
      state: 'blocked',
      severity: 'critical',
      count: 1,
      reason: compilerExplainability.databaseHealth.summary || 'Database health is degraded.',
      recommendation: 'Repair database health before trusting the control plane.'
    });
  }

  const blockedSignals = signals.filter((signal) => isBlockedState(signal.state)).length;
  if (blockedSignals > 0) {
    gaps.push({
      key: 'blocked_signals',
      state: 'blocked',
      severity: 'critical',
      count: blockedSignals,
      reason: `${blockedSignals} control-plane signal(s) are blocked.`,
      recommendation: 'Inspect the blocked signals and repair the corresponding source of truth.'
    });
  }

  return gaps;
}

export function deriveControlPlaneState(gaps = [], signals = []) {
  if (gaps.some((gap) => gap.severity === 'critical' || gap.state === 'blocked')) {
    return 'blocked';
  }

  if (gaps.some((gap) => gap.severity === 'high' || isDriftingState(gap.state))) {
    return 'stale';
  }

  if (gaps.length > 0 || signals.some((signal) => isWatchingState(signal.state))) {
    return 'watching';
  }

  return 'ready';
}

export function buildSummary(state, gaps = [], telemetry = null, propagation = null, systems = null) {
  const primaryGap = gaps[0] || null;
  const nextAction = primaryGap?.recommendation
    || telemetry?.nextAction
    || propagation?.recommendation
    || 'Keep the control plane contracts attached to every status surface.';
  const reason = primaryGap?.reason
    || telemetry?.reason
    || propagation?.reason
    || 'Control-plane contracts are attached.';

  return {
    state,
    nextAction,
    reason,
    summaryText: `state=${state} | systems=${systems?.total || 0} | gaps=${gaps.length} | telemetry=${telemetry?.state || 'missing'} | propagation=${propagation?.state || 'missing'}`,
    oneLine: `controlplane=${state} | telemetry=${telemetry?.state || 'missing'} | propagation=${propagation?.state || 'missing'} | gaps=${gaps.length}`
  };
}

export default {
  buildGapEntries,
  deriveControlPlaneState,
  buildSummary
};
