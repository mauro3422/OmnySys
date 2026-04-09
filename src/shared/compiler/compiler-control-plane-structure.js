import { asNumber } from './core-utils.js';
import { takeSample } from './sample-helpers.js';
import {
  normalizeState,
  severityFromState,
  stateFromCoveragePercent
} from './signal-state-helpers.js';

function buildSystemEntry(item = {}, fallbackRole = 'system', source = 'system inventory') {
  const name = item?.name || item?.surface || item?.entrypoint || item?.id || null;
  if (!name) {
    return null;
  }

  return {
    id: item?.id || name,
    name,
    role: item?.role || fallbackRole,
    kind: item?.kind || item?.systemKind || fallbackRole,
    state: normalizeState(item?.driftState || item?.state || item?.status, fallbackRole === 'emergent' ? 'watching' : 'fresh'),
    healthy: item?.healthy !== false,
    trustworthy: item?.trustworthy !== false,
    source: item?.source || source,
    summary: item?.summary || item?.recommendedAction || null
  };
}

export function buildSystemRegistry(systemInventoryDetail = null, systemInventory = null) {
  const detail = systemInventoryDetail || {};
  const summary = systemInventory?.summary || systemInventoryDetail?.summary || {};
  const buckets = [
    { items: detail.canonicalSurfaces, role: 'canonical' },
    { items: detail.canonicalEntrypoints, role: 'canonical' },
    { items: detail.bridgeSystems, role: 'bridge' },
    { items: detail.wrapperSystems, role: 'wrapper' },
    { items: detail.legacySystems, role: 'legacy' },
    { items: detail.emergentSystems, role: 'emergent' }
  ];
  const systems = buckets.flatMap(({ items, role }) => (Array.isArray(items) ? items : [])
    .map((item) => buildSystemEntry(item, role))
    .filter(Boolean));

  return {
    state: normalizeState(summary.inventoryState || systemInventory?.inventoryState, systems.length > 0 ? 'watching' : 'missing'),
    total: asNumber(summary.totalSystemCount, systems.length),
    canonical: asNumber(summary.canonicalSurfaceCount, 0) + asNumber(summary.canonicalEntrypointCount, 0),
    emergent: asNumber(summary.emergentSystemCount, 0),
    bridge: asNumber(summary.bridgeSystemCount, 0),
    wrapper: asNumber(summary.wrapperSystemCount, 0),
    legacy: asNumber(summary.legacySystemCount, 0),
    metadataCoveragePct: asNumber(summary.metadataCoveragePct || systemInventory?.metadataCoveragePct, 0),
    integrationCoveragePct: asNumber(summary.integrationCoveragePct || systemInventory?.integrationCoveragePct, 0),
    topSystems: Array.isArray(systemInventory?.topSystems) ? systemInventory.topSystems.slice(0, 8) : [],
    entries: takeSample(systems, 18)
  };
}

export function buildContractEntries({
  compilerExplainability,
  systemInventory,
  canonicalPromotion,
  observability
}) {
  const metadataCoveragePct = asNumber(compilerExplainability?.metadataExtractionCoverage?.summary?.coveragePct, 0);
  const compilerContractLayerSurfaces = Array.isArray(compilerExplainability?.compilerContractLayer?.surfaces)
    ? compilerExplainability.compilerContractLayer.surfaces.length
    : 0;
  const dataGatewayTrustworthy = compilerExplainability?.dataGatewayContract?.summary?.trustworthy === true;
  const surfaceAuditTrustworthy = compilerExplainability?.surfaceAudit?.summary?.trustworthy === true
    || compilerExplainability?.surfaceAudit?.trustworthy === true;
  const policyCoverageState = normalizeState(
    systemInventory?.policyCoverage?.coverageState
      || systemInventory?.policyCoverage?.state
      || compilerExplainability?.policyCoverage?.coverageState
      || compilerExplainability?.policyCoverage?.state,
    'missing'
  );

  return [
    {
      key: 'compiler_explainability',
      state: compilerExplainability?.error ? 'blocked' : compilerExplainability ? 'fresh' : 'missing',
      trustworthy: compilerExplainability?.error ? false : Boolean(compilerExplainability),
      sourceOfTruth: 'compiler explainability loader',
      summary: compilerExplainability?.error || 'Compiler explainability is attached.'
    },
    {
      key: 'compiler_contract_layer',
      state: compilerContractLayerSurfaces > 0 ? 'fresh' : 'missing',
      trustworthy: compilerContractLayerSurfaces > 0,
      sourceOfTruth: 'compiler contract layer',
      summary: compilerContractLayerSurfaces > 0
        ? `${compilerContractLayerSurfaces} canonical contract surface(s) registered.`
        : 'No canonical contract surfaces are registered.'
    },
    {
      key: 'system_inventory',
      state: normalizeState(systemInventory?.inventoryState, 'missing'),
      trustworthy: Boolean(systemInventory),
      sourceOfTruth: 'system inventory',
      summary: systemInventory?.summaryText || systemInventory?.nextAction || 'System inventory not attached.'
    },
    {
      key: 'policy_coverage',
      state: policyCoverageState,
      trustworthy: policyCoverageState === 'fresh',
      sourceOfTruth: 'policy coverage',
      summary: systemInventory?.policyCoverage?.summaryText
        || compilerExplainability?.policyCoverage?.summaryText
        || compilerExplainability?.policyCoverage?.nextAction
        || 'Policy coverage not attached.'
    },
    {
      key: 'data_gateway_contract',
      state: dataGatewayTrustworthy
        ? 'fresh'
        : normalizeState(compilerExplainability?.dataGatewayContract?.summary?.primaryIssue?.state, compilerExplainability?.dataGatewayContract ? 'stale' : 'missing'),
      trustworthy: dataGatewayTrustworthy,
      sourceOfTruth: 'data gateway contract',
      summary: compilerExplainability?.dataGatewayContract?.summary?.nextAction || 'Data gateway contract not attached.'
    },
    {
      key: 'metadata_extraction_coverage',
      state: stateFromCoveragePercent(metadataCoveragePct),
      trustworthy: metadataCoveragePct >= 95,
      sourceOfTruth: 'metadata extraction coverage',
      summary: `coverage=${metadataCoveragePct}%`
    },
    {
      key: 'surface_audit',
      state: surfaceAuditTrustworthy ? 'fresh' : normalizeState(compilerExplainability?.surfaceAudit?.summary?.state, compilerExplainability?.surfaceAudit ? 'watching' : 'missing'),
      trustworthy: surfaceAuditTrustworthy,
      sourceOfTruth: 'surface audit',
      summary: compilerExplainability?.surfaceAudit?.summary?.nextAction || 'Surface audit not attached.'
    },
    {
      key: 'canonical_promotion',
      state: normalizeState(canonicalPromotion?.promotionState || canonicalPromotion?.summary?.promotionState, canonicalPromotion ? 'watching' : 'missing'),
      trustworthy: Boolean(canonicalPromotion),
      sourceOfTruth: 'canonical promotion',
      summary: canonicalPromotion?.summaryText || canonicalPromotion?.nextAction || 'Canonical promotion not attached.'
    },
    {
      key: 'observability',
      state: normalizeState(observability?.state, observability ? 'watching' : 'missing'),
      trustworthy: observability?.trustworthy === true,
      sourceOfTruth: 'compiler observability contract',
      summary: observability?.summary || observability?.reason || 'Observability not attached.'
    }
  ];
}

export function buildSignalEntries({
  compilerExplainability,
  observability
}) {
  const metadataCoveragePct = asNumber(compilerExplainability?.metadataExtractionCoverage?.summary?.coveragePct, 0);
  const databaseHealthy = compilerExplainability?.databaseHealth?.healthy === true;
  const driftSignals = Array.isArray(observability?.signals) ? observability.signals : [];
  const mappedSignals = driftSignals.map((signal) => ({
    key: signal?.key || 'unknown',
    state: normalizeState(signal?.state, 'missing'),
    healthy: signal?.healthy === true,
    trustworthy: signal?.trustworthy === true,
    reason: signal?.reason || null,
    recommendation: signal?.recommendation || null,
    sourceOfTruth: signal?.sourceOfTruth || 'observability contract',
    severity: severityFromState(signal?.state)
  }));
  const extraSignals = [
    {
      key: 'metadata_coverage',
      state: stateFromCoveragePercent(metadataCoveragePct),
      healthy: metadataCoveragePct >= 95,
      trustworthy: metadataCoveragePct >= 95,
      reason: `Metadata extraction coverage is ${metadataCoveragePct}%.`,
      recommendation: metadataCoveragePct >= 95
        ? 'Keep routing metadata extraction through the canonical coverage surface.'
        : 'Raise metadata extraction coverage before trusting downstream inventory summaries.',
      sourceOfTruth: 'metadata extraction coverage',
      severity: severityFromState(stateFromCoveragePercent(metadataCoveragePct))
    },
    {
      key: 'schema_health',
      state: databaseHealthy
        ? 'fresh'
        : normalizeState(compilerExplainability?.databaseHealth?.grade ? 'stale' : 'missing'),
      healthy: databaseHealthy,
      trustworthy: databaseHealthy,
      reason: compilerExplainability?.databaseHealth?.summary || 'Database health not attached.',
      recommendation: databaseHealthy
        ? 'Keep the schema registry aligned with the live database.'
        : 'Repair database health before trusting compiler persistence surfaces.',
      sourceOfTruth: 'database health summary',
      severity: severityFromState(databaseHealthy ? 'fresh' : (compilerExplainability?.databaseHealth ? 'stale' : 'missing'))
    }
  ];

  return [...mappedSignals, ...extraSignals];
}

export function buildPropagationRegistry(compilerExplainability = null, systemInventory = null) {
  const automation = compilerExplainability?.folderization?.automation || null;
  const adoption = automation?.propagationAdoption || null;
  const propagation = compilerExplainability?.folderization?.propagation || null;
  const driftSignal = compilerExplainability?.driftAssessment?.signals?.find((signal) => signal?.key === 'propagation_expansion')
    || (compilerExplainability?.driftAssessment?.primaryIssue?.key === 'propagation_expansion' ? compilerExplainability.driftAssessment.primaryIssue : null);
  const policyCoverage = systemInventory?.policyCoverage || compilerExplainability?.policyCoverage || null;
  const state = normalizeState(
    adoption?.adoptionState
      || driftSignal?.state
      || policyCoverage?.propagationExpansionState
      || propagation?.decision,
    'missing'
  );

  return {
    state,
    changeType: propagation?.changeType || 'folderization',
    mode: propagation?.mode || null,
    decision: propagation?.decision || null,
    expectedSystemCount: asNumber(adoption?.requiredSystemCount, 0),
    surfacedSystemCount: asNumber(adoption?.surfacedSystemCount, 0),
    missingSystemCount: asNumber(adoption?.missingSystemCount, 0),
    coverageRatio: Number(adoption?.coverageRatio || 0),
    connectedSystems: takeSample(propagation?.connectedSystems || adoption?.requiredSystems || [], 10),
    surfacedSystems: takeSample(adoption?.surfacedSystems || adoption?.adoptedSystems || [], 10),
    missingSystems: takeSample(adoption?.missingSystems || [], 10),
    missingSystemNames: takeSample(adoption?.missingSystemNames || [], 8),
    reason: adoption?.reason || driftSignal?.reason || policyCoverage?.nextAction || 'Propagation evidence is missing.',
    recommendation: adoption?.nextAction || driftSignal?.recommendation || policyCoverage?.nextAction || 'Attach propagation evidence to all downstream consumers.'
  };
}

export default {
  buildSystemRegistry,
  buildContractEntries,
  buildSignalEntries,
  buildPropagationRegistry
};
