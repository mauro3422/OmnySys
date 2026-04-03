/**
 * Canonical system inventory for emergent APIs, contract surfaces and hubs.
 *
 * This inventory is intentionally broader than MCP tool inventory. It groups
 * compiler/runtime surfaces into canonical, bridge, wrapper, legacy and
 * emergent candidates so downstream status and health surfaces can answer:
 * "what systems exist, what is emerging, and what should be promoted next?"
 */

import { asNumber } from './core-utils.js';
import { buildCompilerToolInventorySnapshot } from './tool-inventory-summary.js';

function normalizeToolInventory(toolInventory = null) {
  if (!toolInventory) {
    return buildCompilerToolInventorySnapshot({ includeSchemas: false });
  }

  if (toolInventory.snapshot && typeof toolInventory.snapshot === 'object') {
    return toolInventory.snapshot;
  }

  return toolInventory;
}

function normalizeText(value, fallback = null) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return fallback;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(asNumber(value, 0))));
}

function scoreForRole(role = 'legacy', trusted = true, healthy = true) {
  const base = {
    canonical: 96,
    emergent: 84,
    bridge: 68,
    wrapper: 52,
    legacy: 34,
    tooling: 62,
    candidate: 80
  }[role] || 40;

  const trustPenalty = trusted ? 0 : 8;
  const healthPenalty = healthy ? 0 : 10;
  return clampScore(base - trustPenalty - healthPenalty);
}

function deriveRoleFromSurface(surface = {}) {
  if (surface.sourceOfTruth === true || surface.status === 'canonical') {
    return 'canonical';
  }

  if (surface.status === 'mirrored_support') {
    return 'bridge';
  }

  if (surface.status === 'advisory' || surface.status === 'advisory_only' || String(surface.status || '').includes('drift')) {
    return 'wrapper';
  }

  return 'legacy';
}

function buildSurfaceInventoryEntry(surface = {}, { kind = 'surface', role = null, recommendedAction = null, entrypoint = null } = {}) {
  const resolvedRole = role || deriveRoleFromSurface(surface);
  const trustworthy = surface.trustworthy !== false;
  const healthy = surface.healthy !== false;
  const centralityScore = scoreForRole(resolvedRole, trustworthy, healthy);
  const propagationScore = clampScore(centralityScore - (healthy ? 0 : 12) - (trustworthy ? 0 : 8));

  return {
    id: surface.id || surface.surface || entrypoint || `${resolvedRole}:${kind}`,
    kind,
    role: resolvedRole,
    status: surface.status || resolvedRole,
    canonicalStatus: surface.sourceOfTruth === true ? 'canonical' : resolvedRole,
    sourceOfTruth: surface.sourceOfTruth === true,
    surface: surface.surface || surface.id || entrypoint || null,
    entrypoint: entrypoint || surface.entrypoint || null,
    domain: surface.domain || surface.scope || null,
    scope: surface.scope || null,
    backingSurface: surface.backingSurface || null,
    centralityScore,
    propagationScore,
    driftState: healthy ? 'stable' : 'watching',
    trustworthy,
    healthy,
    summary: normalizeText(surface.summary, null),
    evidence: surface.evidence || {},
    recommendedAction,
    source: kind === 'entrypoint' ? 'compiler-contract-layer.entrypoints' : 'compiler-contract-layer.surfaces'
  };
}

function buildCandidateEntry(candidate = {}, role = 'emergent') {
  const severity = String(candidate.severity || 'medium').toLowerCase();
  const severityPenalty = {
    critical: 0,
    high: 4,
    medium: 10,
    low: 18
  }[severity] ?? 12;

  const centralityScore = clampScore(90 - severityPenalty);

  return {
    id: candidate.id || candidate.key || candidate.surface || candidate.target || candidate.reason || `candidate:${role}`,
    kind: candidate.kind || 'candidate',
    role,
    status: candidate.status || 'emergent',
    canonicalStatus: role,
    sourceOfTruth: false,
    surface: candidate.surface || candidate.id || candidate.key || null,
    domain: candidate.domain || candidate.area || null,
    scope: candidate.scope || null,
    backingSurface: candidate.backingSurface || null,
    centralityScore,
    propagationScore: clampScore(centralityScore - severityPenalty / 2),
    driftState: 'watching',
    trustworthy: false,
    healthy: false,
    summary: candidate.reason || candidate.summary || candidate.label || null,
    evidence: candidate,
    recommendedAction: candidate.recommendation || null,
    source: 'standardization / contract-governance'
  };
}

function dedupeById(entries = []) {
  const seen = new Set();
  return entries.filter((entry) => {
    const id = entry?.id || entry?.surface || entry?.entrypoint;
    if (!id || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}

function sortByCentrality(entries = []) {
  return [...entries].sort((left, right) =>
    (right?.centralityScore || 0) - (left?.centralityScore || 0)
      || (right?.propagationScore || 0) - (left?.propagationScore || 0)
      || String(left?.id || '').localeCompare(String(right?.id || ''))
  );
}

function buildToolingSection(toolInventory = null) {
  const snapshot = normalizeToolInventory(toolInventory);
  const dominantCategory = snapshot?.dominantCategory?.category || snapshot?.dominantCategory || null;
  const dominantSubgroup = snapshot?.dominantSubgroup?.subgroup || null;
  const concentration = asNumber(snapshot?.concentration, 0);
  const categoryConcentration = asNumber(snapshot?.categoryConcentration, 0);
  const noiseSummary = snapshot?.noiseSummary || null;

  return {
    totalTools: asNumber(snapshot?.totalTools, 0),
    dominantCategory,
    dominantSubgroup,
    concentration,
    categoryConcentration,
    noiseScore: asNumber(noiseSummary?.noiseScore, 0),
    noiseRate: asNumber(noiseSummary?.noiseRate, 0),
    noisyToolCount: asNumber(noiseSummary?.noisyToolCount, 0),
    topTools: Array.isArray(snapshot?.topTools) ? snapshot.topTools.slice(0, 5) : [],
    noiseSummary: noiseSummary ? {
      totalRuns: asNumber(noiseSummary.totalRuns, 0),
      noisyRunCount: asNumber(noiseSummary.noisyRunCount, 0),
      noisyToolCount: asNumber(noiseSummary.noisyToolCount, 0),
      noiseRate: asNumber(noiseSummary.noiseRate, 0),
      noiseScore: asNumber(noiseSummary.noiseScore, 0),
      noiseTopTools: Array.isArray(noiseSummary.noiseTopTools) ? noiseSummary.noiseTopTools.slice(0, 5) : [],
      topReasons: Array.isArray(noiseSummary.topReasons) ? noiseSummary.topReasons.slice(0, 5) : []
    } : null
  };
}

function buildInventoryState(summary = {}) {
  if (summary.surfaceAuditTrustworthy === false || summary.dataGatewayTrustworthy === false) {
    return 'watching';
  }

  if ((summary.emergentSystemCount || 0) > 0 || (summary.wrapperSystemCount || 0) > 0 || (summary.bridgeSystemCount || 0) > 0) {
    return 'watching';
  }

  if ((summary.contractParallelSurfaceFindings || 0) > 0 || (summary.contractWrapperFindings || 0) > 0 || (summary.standardizationGapCount || 0) > 0) {
    return 'watching';
  }

  return 'ready';
}

function buildInventorySummary({
  canonicalSurfaces = [],
  canonicalEntrypoints = [],
  emergentSystems = [],
  bridgeSystems = [],
  wrapperSystems = [],
  legacySystems = [],
  tooling = {},
  signals = {}
} = {}) {
  const allSystems = dedupeById([
    ...canonicalSurfaces,
    ...canonicalEntrypoints,
    ...emergentSystems,
    ...bridgeSystems,
    ...wrapperSystems,
    ...legacySystems
  ]);
  const topSystems = sortByCentrality(allSystems).slice(0, 8);
  const topPromotionCandidates = sortByCentrality(emergentSystems).slice(0, 5);
  const toolHubCategory = tooling.dominantCategory || null;
  const toolHubSubgroup = tooling.dominantSubgroup || null;
  const summary = {
    totalSystemCount: allSystems.length,
    canonicalSurfaceCount: canonicalSurfaces.filter((entry) => entry.role === 'canonical' || entry.sourceOfTruth === true).length,
    canonicalEntrypointCount: canonicalEntrypoints.length,
    emergentSystemCount: emergentSystems.length,
    bridgeSystemCount: bridgeSystems.length,
    wrapperSystemCount: wrapperSystems.length,
    legacySystemCount: legacySystems.length,
    hubSystemCount: topSystems.length,
    standardizationGapCount: asNumber(signals.standardizationGapCount, 0),
    missingCanonicalApiCount: asNumber(signals.missingCanonicalApiCount, 0),
    missingCanonicalSurfaceCount: asNumber(signals.missingCanonicalSurfaceCount, 0),
    policyDriftCount: asNumber(signals.policyDriftCount, 0),
    contractWrapperFindings: asNumber(signals.contractWrapperFindings, 0),
    contractParallelSurfaceFindings: asNumber(signals.contractParallelSurfaceFindings, 0),
    surfaceAuditTrustworthy: signals.surfaceAuditTrustworthy === true,
    dataGatewayTrustworthy: signals.dataGatewayTrustworthy === true,
    metadataCoveragePct: asNumber(signals.metadataCoveragePct, 0),
    propagationExpansionState: signals.propagationExpansionState || null,
    dominantToolCategory: toolHubCategory,
    dominantToolSubgroup: toolHubSubgroup,
    toolConcentration: tooling.concentration || 0,
    toolCategoryConcentration: tooling.categoryConcentration || 0,
    noiseScore: tooling.noiseScore || 0,
    noisyToolCount: tooling.noisyToolCount || 0,
    nextAction:
      topPromotionCandidates[0]?.recommendedAction
      || signals.nextAction
      || 'Adopt the missing canonical surfaces before adding more wrappers.'
  };

  summary.inventoryState = buildInventoryState(summary);
  summary.summaryText = [
    `canonical=${summary.canonicalSurfaceCount + summary.canonicalEntrypointCount}`,
    `emergent=${summary.emergentSystemCount}`,
    `bridge=${summary.bridgeSystemCount}`,
    `wrapper=${summary.wrapperSystemCount}`,
    `legacy=${summary.legacySystemCount}`,
    `audit=${summary.surfaceAuditTrustworthy ? 'ok' : 'watching'}`,
    `gateway=${summary.dataGatewayTrustworthy ? 'ok' : 'watching'}`,
    `meta=${Math.round(summary.metadataCoveragePct)}%`,
    `tools=${tooling.totalTools}`,
    `noise=${summary.noisyToolCount}/${Math.round(summary.noiseScore)}`,
    `state=${summary.inventoryState}`,
    `next=${summary.nextAction}`
  ].join(' | ');

  return {
    ...summary,
    topSystems,
    topPromotionCandidates
  };
}

export function buildCompilerSystemInventorySnapshot({
  projectPath = null,
  scopePath = null,
  focusPath = null,
  compilerExplainability = null,
  toolInventory = null,
  limit = 10
} = {}) {
  const standardization = compilerExplainability?.standardization || null;
  const contractLayer = compilerExplainability?.compilerContractLayer || null;
  const driftAssessment = compilerExplainability?.driftAssessment || null;
  const policySummary = compilerExplainability?.policySummary || null;
  const surfaceAudit = compilerExplainability?.surfaceAudit || null;
  const canonicalSurfaces = Array.isArray(contractLayer?.surfaces) ? contractLayer.surfaces : [];
  const canonicalEntrypoints = Array.isArray(contractLayer?.canonicalEntrypoints) ? contractLayer.canonicalEntrypoints : [];
  const missingCanonicalApis = Array.isArray(standardization?.missingCanonicalApis) ? standardization.missingCanonicalApis : [];
  const missingCanonicalSurfaces = Array.isArray(standardization?.missingCanonicalSurfaces) ? standardization.missingCanonicalSurfaces : [];
  const governanceCandidates = Array.isArray(contractLayer?.apiGovernance?.currentCreationCandidates)
    ? contractLayer.apiGovernance.currentCreationCandidates
    : [];
  const emergentSystems = dedupeById([
    ...missingCanonicalApis.map((candidate) => buildCandidateEntry(candidate, 'emergent')),
    ...missingCanonicalSurfaces.map((candidate) => buildCandidateEntry(candidate, 'emergent')),
    ...governanceCandidates.map((candidate) => buildCandidateEntry(candidate, 'emergent'))
  ]).slice(0, limit);

  const canonicalSurfaceEntries = sortByCentrality(
    canonicalSurfaces.map((surface) => buildSurfaceInventoryEntry(surface, {
      role: surface.sourceOfTruth === true || surface.status === 'canonical' ? 'canonical' : deriveRoleFromSurface(surface),
      recommendedAction: surface.sourceOfTruth === true
        ? 'Keep this as the source of truth.'
        : surface.status === 'mirrored_support'
          ? 'Keep this bridge aligned with the canonical source.'
          : surface.status === 'advisory' || surface.status === 'advisory_only'
            ? 'Consider collapsing this wrapper into the canonical contract.'
            : 'Verify whether this surface should be canonical or retired.'
    }))
  ).slice(0, limit * 2);

  const canonicalEntrypointEntries = sortByCentrality(
    canonicalEntrypoints.map((entrypoint) => ({
      id: entrypoint.id || entrypoint.entrypoint,
      kind: 'entrypoint',
      role: 'canonical',
      status: entrypoint.status || 'canonical',
      canonicalStatus: 'canonical',
      sourceOfTruth: true,
      surface: entrypoint.id || entrypoint.entrypoint,
      entrypoint: entrypoint.entrypoint || entrypoint.id || null,
      domain: entrypoint.domain || null,
      scope: entrypoint.domain || null,
      backingSurface: null,
      centralityScore: 98,
      propagationScore: 96,
      driftState: 'stable',
      trustworthy: true,
      healthy: true,
      summary: `Canonical entrypoint for ${entrypoint.domain || 'compiler governance'}.`,
      evidence: entrypoint,
      recommendedAction: 'Keep this as the canonical entrypoint.',
      source: 'compiler-contract-layer.entrypoints'
    }))
  ).slice(0, limit * 2);

  const bridgeSystems = sortByCentrality(
    canonicalSurfaces
      .filter((surface) => surface.status === 'mirrored_support')
      .map((surface) => buildSurfaceInventoryEntry(surface, {
        role: 'bridge',
        recommendedAction: 'Keep the bridge synchronized with its canonical source.'
      }))
  ).slice(0, limit);

  const wrapperSystems = sortByCentrality(
    canonicalSurfaces
      .filter((surface) => surface.sourceOfTruth !== true && (surface.status === 'advisory' || surface.status === 'advisory_only' || String(surface.status || '').includes('drift')))
      .map((surface) => buildSurfaceInventoryEntry(surface, {
        role: 'wrapper',
        recommendedAction: 'Promote the underlying contract and collapse this wrapper if possible.'
      }))
  ).slice(0, limit);

  const legacySystems = sortByCentrality(
    canonicalSurfaces
      .filter((surface) => surface.sourceOfTruth !== true && !['mirrored_support', 'advisory', 'advisory_only'].includes(surface.status) && String(surface.status || '').includes('legacy'))
      .map((surface) => buildSurfaceInventoryEntry(surface, {
        role: 'legacy',
        recommendedAction: 'Replace or retire this legacy surface once a canonical replacement exists.'
      }))
  ).slice(0, limit);

  const tooling = buildToolingSection(toolInventory);
  const signals = {
    policyDriftCount: asNumber(policySummary?.total, 0),
    standardizationGapCount: asNumber(standardization?.summary?.adoptionGapCount, 0),
    missingCanonicalApiCount: asNumber(standardization?.summary?.missingCanonicalApiCount, 0),
    missingCanonicalSurfaceCount: asNumber(standardization?.summary?.missingCanonicalSurfaceCount, 0),
    contractWrapperFindings: asNumber(contractLayer?.summary?.canonicalWrapperFindings, 0),
    contractParallelSurfaceFindings: asNumber(contractLayer?.summary?.parallelCanonicalSurfaceFindings, 0),
    surfaceAuditTrustworthy: surfaceAudit?.summary?.trustworthy === true,
    dataGatewayTrustworthy: compilerExplainability?.dataGatewayContract?.summary?.trustworthy === true,
    metadataCoveragePct: asNumber(compilerExplainability?.metadataExtractionCoverage?.summary?.coveragePct, 0),
    propagationExpansionState:
      driftAssessment?.signals?.find((signal) => signal?.key === 'propagation_expansion')?.state
      || driftAssessment?.primaryIssue?.state
      || null,
    nextAction:
      standardization?.summary?.nextAction
      || contractLayer?.summary?.nextAction
      || driftAssessment?.primaryIssue?.recommendation
      || null
  };

  const summary = buildInventorySummary({
    canonicalSurfaces: canonicalSurfaceEntries,
    canonicalEntrypoints: canonicalEntrypointEntries,
    emergentSystems,
    bridgeSystems,
    wrapperSystems,
    legacySystems,
    tooling,
    signals
  });

  return {
    projectPath,
    scopePath,
    focusPath,
    capturedAt: new Date().toISOString(),
    canonicalSurfaces: canonicalSurfaceEntries,
    canonicalEntrypoints: canonicalEntrypointEntries,
    emergentSystems,
    bridgeSystems,
    wrapperSystems,
    legacySystems,
    tooling,
    signals,
    summary
  };
}

export function buildCompilerSystemInventoryReport(inventory = null) {
  if (!inventory || typeof inventory !== 'object') {
    return null;
  }

  const summary = inventory.summary || {};

  return {
    inventoryState: summary.inventoryState || 'watching',
    totalSystemCount: summary.totalSystemCount || 0,
    canonicalSurfaceCount: summary.canonicalSurfaceCount || 0,
    canonicalEntrypointCount: summary.canonicalEntrypointCount || 0,
    emergentSystemCount: summary.emergentSystemCount || 0,
    bridgeSystemCount: summary.bridgeSystemCount || 0,
    wrapperSystemCount: summary.wrapperSystemCount || 0,
    legacySystemCount: summary.legacySystemCount || 0,
    hubSystemCount: summary.hubSystemCount || 0,
    standardizationGapCount: summary.standardizationGapCount || 0,
    missingCanonicalApiCount: summary.missingCanonicalApiCount || 0,
    missingCanonicalSurfaceCount: summary.missingCanonicalSurfaceCount || 0,
    policyDriftCount: summary.policyDriftCount || 0,
    contractWrapperFindings: summary.contractWrapperFindings || 0,
    contractParallelSurfaceFindings: summary.contractParallelSurfaceFindings || 0,
    surfaceAuditTrustworthy: summary.surfaceAuditTrustworthy === true,
    dataGatewayTrustworthy: summary.dataGatewayTrustworthy === true,
    metadataCoveragePct: summary.metadataCoveragePct || 0,
    propagationExpansionState: summary.propagationExpansionState || null,
    dominantToolCategory: summary.dominantToolCategory || null,
    dominantToolSubgroup: summary.dominantToolSubgroup || null,
    toolConcentration: summary.toolConcentration || 0,
    toolCategoryConcentration: summary.toolCategoryConcentration || 0,
    noiseScore: summary.noiseScore || 0,
    noisyToolCount: summary.noisyToolCount || 0,
    nextAction: summary.nextAction || null,
    summaryText: summary.summaryText || null,
    topSystems: Array.isArray(summary.topSystems) ? summary.topSystems.slice(0, 8) : [],
    topPromotionCandidates: Array.isArray(summary.topPromotionCandidates) ? summary.topPromotionCandidates.slice(0, 5) : [],
    tooling: inventory.tooling || null
  };
}

export function summarizeCompilerSystemInventory(inventory = null) {
  return buildCompilerSystemInventoryReport(inventory);
}

export default {
  buildCompilerSystemInventorySnapshot,
  buildCompilerSystemInventoryReport,
  summarizeCompilerSystemInventory
};
