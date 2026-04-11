import { asNumber } from './core-utils.js';
import { normalizeState } from './signal-state-helpers.js';

function pushEntry(ledger, entry) {
  if (!ledger.entries) {
    ledger.entries = [];
  }
  ledger.entries.push(entry);
  ledger.latest = entry;
  ledger.updatedAt = entry.updatedAt;
}

function detectAlignmentState(metricAlignment = null, policyCoverage = null, systemInventory = null, compilerExplainability = null) {
  return normalizeState(
    metricAlignment?.state
      || policyCoverage?.coverageState
      || systemInventory?.policyCoverage?.coverageState
      || compilerExplainability?.policyCoverage?.coverageState
      || 'watching',
    'watching'
  );
}

export function buildPropagationLedger({
  compilerExplainability = null,
  systemInventory = null,
  metricAlignment = null,
  sharedState = null,
  source = 'unknown',
  watcherStats = null,
  watcherAlerts = []
} = {}) {
  const policySummary = compilerExplainability?.policySummary || null;
  const policyCoverage = compilerExplainability?.policyCoverage || systemInventory?.policyCoverage || null;
  const effectivePolicyDriftCount = asNumber(
    policySummary?.effectiveTotal
      ?? policySummary?.total
      ?? policyCoverage?.policyDriftCount
      ?? systemInventory?.policyDriftCount
      ?? 0,
    0
  );
  const propagationExpansionState = normalizeState(
    policyCoverage?.propagationExpansionState
      || compilerExplainability?.driftAssessment?.signals?.find((signal) => signal?.key === 'propagation_expansion')?.state
      || compilerExplainability?.driftAssessment?.primaryIssue?.state
      || 'watching',
    'watching'
  );
  const alignmentState = detectAlignmentState(metricAlignment, policyCoverage, systemInventory, compilerExplainability);
  const refreshState = effectivePolicyDriftCount === 0 && propagationExpansionState === 'fresh' ? 'aligned'
    : effectivePolicyDriftCount > 0 || propagationExpansionState === 'stale' || propagationExpansionState === 'blocked'
      ? 'drifting'
      : 'watching';

  const affectedSurfaces = [
    'policy_coverage',
    'system_inventory',
    'status',
    'health_snapshot',
    'metrics_snapshot',
    'trust'
  ];

  const ledger = {
    state: refreshState,
    alignmentState,
    policyDriftCount: effectivePolicyDriftCount,
    rawPolicyDriftCount: asNumber(policySummary?.total, effectivePolicyDriftCount),
    propagationExpansionState,
    affectedSurfaces,
    source,
    watcherStats: watcherStats || null,
    watcherAlertsCount: Array.isArray(watcherAlerts) ? watcherAlerts.length : 0,
    reason: refreshState === 'aligned'
      ? 'watcher refresh matches the canonical explainability snapshot'
      : `watcher refresh surfaced ${effectivePolicyDriftCount} effective policy drift finding(s) with propagation=${propagationExpansionState}`,
    recommendation: refreshState === 'aligned'
      ? 'Keep publishing the refreshed snapshot after watcher completion.'
      : 'Reconcile the watcher refresh with the canonical propagation contract and re-read the refreshed snapshot.',
    entries: [],
    latest: null,
    updatedAt: new Date().toISOString()
  };

  pushEntry(ledger, {
    type: 'refresh',
    state: ledger.state,
    alignmentState,
    policyDriftCount: ledger.policyDriftCount,
    propagationExpansionState,
    affectedSurfaces,
    source,
    updatedAt: ledger.updatedAt
  });

  if (sharedState && typeof sharedState === 'object') {
    sharedState.propagationLedger = ledger;
    sharedState.propagationLedgerUpdatedAt = ledger.updatedAt;
  }

  return ledger;
}

export function summarizePropagationLedger(ledger = null) {
  if (!ledger || typeof ledger !== 'object') {
    return null;
  }

  return {
    state: ledger.state || 'missing',
    alignmentState: ledger.alignmentState || null,
    policyDriftCount: ledger.policyDriftCount || 0,
    rawPolicyDriftCount: ledger.rawPolicyDriftCount || 0,
    propagationExpansionState: ledger.propagationExpansionState || null,
    affectedSurfaces: Array.isArray(ledger.affectedSurfaces) ? ledger.affectedSurfaces.slice(0, 8) : [],
    source: ledger.source || null,
    reason: ledger.reason || null,
    recommendation: ledger.recommendation || null,
    updatedAt: ledger.updatedAt || null
  };
}

export default {
  buildPropagationLedger,
  summarizePropagationLedger
};
