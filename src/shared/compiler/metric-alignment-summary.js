import { asNumber } from './core-utils.js';
import { normalizeState } from './signal-state-helpers.js';

function clampPercent(value) {
  const normalized = asNumber(value, 0);
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function severityFromAlignmentState(state) {
  switch (state) {
    case 'blocked':
      return 'critical';
    case 'drifting':
      return 'high';
    case 'watching':
      return 'medium';
    default:
      return 'low';
  }
}

function resolvePreferredMetadataCoverage(compilerExplainability = null, systemInventory = null, current = null) {
  const fieldCoveragePct = clampPercent(
    compilerExplainability?.metadataExtractionCoverage?.summary?.fieldCoveragePct
      ?? compilerExplainability?.metadataExtractionCoverage?.summary?.coveragePct
      ?? systemInventory?.metadataFieldCoveragePct
      ?? systemInventory?.metadataCoveragePct
      ?? current?.metadataFieldCoveragePct
      ?? current?.metadataCoveragePct
      ?? 0
  );
  const weightedCoveragePct = clampPercent(
    compilerExplainability?.metadataExtractionCoverage?.summary?.coveragePct
      ?? systemInventory?.metadataCoveragePct
      ?? current?.metadataCoveragePct
      ?? 0
  );

  return {
    fieldCoveragePct,
    weightedCoveragePct,
    metadataCoveragePct: fieldCoveragePct || weightedCoveragePct
  };
}

export function buildMetricAlignmentSignal({
  compilerExplainability = null,
  systemInventory = null,
  current = null,
  bridgeCallReliability = null,
  trust = null
} = {}) {
  const schemaHealthy = compilerExplainability?.databaseHealth?.healthy === true;
  const databaseHealthy = schemaHealthy;
  const metadata = resolvePreferredMetadataCoverage(compilerExplainability, systemInventory, current);
  const policyCoverageState = normalizeState(
    systemInventory?.policyCoverage?.coverageState
      || systemInventory?.policyCoverageState
      || trust?.policyCoverageState
      || current?.policyCoverage?.coverageState
      || 'watching',
    'watching'
  );
  const propagationState = normalizeState(
    systemInventory?.policyCoverage?.propagationExpansionState
      || systemInventory?.policyCoveragePropagationState
      || current?.policyCoverage?.propagationExpansionState
      || policyCoverageState
      || 'watching',
    policyCoverageState || 'watching'
  );
  const bridgeState = normalizeState(
    bridgeCallReliability?.state || current?.bridgeCallReliability?.state || 'stable',
    'stable'
  );

  const inventoryCoveragePct = clampPercent(systemInventory?.metadataCoveragePct ?? current?.metadataCoveragePct ?? 0);
  const metadataDriftPct = Math.abs(metadata.metadataCoveragePct - inventoryCoveragePct);
  const weightedDriftPct = Math.abs(metadata.fieldCoveragePct - metadata.weightedCoveragePct);
  const hasCoverageDrift = metadataDriftPct >= 5 || weightedDriftPct >= 5;
  const hasPolicyDrift = policyCoverageState !== 'fresh' || propagationState === 'stale' || propagationState === 'blocked';
  const hasBridgeDrift = bridgeState === 'thrashing';

  let state = 'aligned';
  if (!schemaHealthy || !databaseHealthy) {
    state = 'blocked';
  } else if (hasCoverageDrift || hasPolicyDrift || hasBridgeDrift) {
    state = metadataDriftPct >= 15 || bridgeState === 'thrashing' ? 'drifting' : 'watching';
  }

  const reasons = [];
  if (!schemaHealthy) {
    reasons.push('schema/database health is degraded');
  }
  if (metadataDriftPct >= 5) {
    reasons.push(`metadata coverage drifts by ${metadataDriftPct}% between field truth and inventory summary`);
  }
  if (weightedDriftPct >= 5) {
    reasons.push(`weighted metadata coverage differs from field coverage by ${weightedDriftPct}%`);
  }
  if (policyCoverageState !== 'fresh') {
    reasons.push(`policy coverage is ${policyCoverageState}`);
  }
  if (propagationState === 'stale' || propagationState === 'blocked') {
    reasons.push(`propagation is ${propagationState}`);
  }
  if (bridgeState === 'thrashing') {
    reasons.push('bridge calls are thrashing');
  }

  const reason = reasons.length > 0 ? reasons.join('; ') : 'schema, metadata, inventory, policy and bridge signals are aligned';
  const recommendation =
    state === 'aligned'
      ? 'Keep using the field-level metadata coverage as the canonical source of truth.'
      : state === 'blocked'
        ? 'Repair schema or database health before trusting the control plane.'
        : 'Reconcile the inventory summary and policy propagation with field-level metadata truth.';

  return {
    state,
    healthy: state === 'aligned',
    trustworthy: state === 'aligned',
    databaseHealthy,
    schemaHealthy,
    coverage: {
      fieldCoveragePct: metadata.fieldCoveragePct,
      weightedCoveragePct: metadata.weightedCoveragePct,
      inventoryCoveragePct,
      driftPct: metadataDriftPct,
      weightedDriftPct
    },
    policyCoverageState,
    propagationState,
    bridgeState,
    reason,
    recommendation,
    severity: severityFromAlignmentState(state)
  };
}

export function summarizeMetricAlignment(signal = null) {
  if (!signal || typeof signal !== 'object') {
    return null;
  }

  return {
    state: signal.state || 'missing',
    healthy: signal.healthy === true,
    trustworthy: signal.trustworthy === true,
    schemaHealthy: signal.schemaHealthy === true,
    databaseHealthy: signal.databaseHealthy === true,
    coverage: signal.coverage || null,
    policyCoverageState: signal.policyCoverageState || null,
    propagationState: signal.propagationState || null,
    bridgeState: signal.bridgeState || null,
    reason: signal.reason || null,
    recommendation: signal.recommendation || null
  };
}

export default {
  buildMetricAlignmentSignal,
  summarizeMetricAlignment
};
