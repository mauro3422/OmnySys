import { asNumber } from './core-utils.js';
import { buildCompilerToolInventorySnapshot } from './tool-inventory-summary.js';

export function normalizeToolInventory(toolInventory = null) {
  if (!toolInventory) {
    return buildCompilerToolInventorySnapshot({ includeSchemas: false });
  }

  if (toolInventory.snapshot && typeof toolInventory.snapshot === 'object') {
    return toolInventory.snapshot;
  }

  return toolInventory;
}

export function normalizeText(value, fallback = null) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return fallback;
}

export function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(asNumber(value, 0))));
}

export function scoreForRole(role = 'legacy', trusted = true, healthy = true) {
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

export function inferSystemKind(surface = {}) {
  const surfaceText = [
    surface.kind,
    surface.role,
    surface.status,
    surface.surface,
    surface.entrypoint,
    surface.domain,
    surface.scope,
    surface.summary,
    surface.backingSurface,
    surface.source
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .join(' ');

  if (surface.sourceOfTruth === true || surface.status === 'canonical') {
    return 'canonical_like';
  }

  if (surfaceText.includes('db') || surfaceText.includes('sqlite') || surfaceText.includes('storage') || surfaceText.includes('persistence')) {
    return 'db_like';
  }

  if (surfaceText.includes('api') || surfaceText.includes('endpoint') || surfaceText.includes('route') || surfaceText.includes('tool')) {
    return 'api_like';
  }

  if (surfaceText.includes('guard') || surfaceText.includes('policy') || surfaceText.includes('drift') || surfaceText.includes('validation') || surfaceText.includes('watcher')) {
    return 'guard_like';
  }

  if (surfaceText.includes('bridge') || surfaceText.includes('wrapper') || surfaceText.includes('proxy') || surfaceText.includes('adaptor') || surfaceText.includes('adapter')) {
    return 'bridge_like';
  }

  if (surfaceText.includes('metric') || surfaceText.includes('health') || surfaceText.includes('status') || surfaceText.includes('dashboard') || surfaceText.includes('snapshot')) {
    return 'observability_like';
  }

  if (surfaceText.includes('inventory') || surfaceText.includes('contract') || surfaceText.includes('promotion') || surfaceText.includes('folderization')) {
    return 'governance_like';
  }

  return 'unknown';
}

export function deriveRoleFromSurface(surface = {}) {
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

export function buildSurfaceInventoryEntry(surface = {}, { kind = 'surface', role = null, recommendedAction = null, entrypoint = null } = {}) {
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
    systemKind: inferSystemKind(surface),
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

export function buildCandidateEntry(candidate = {}, role = 'emergent') {
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
    systemKind: inferSystemKind(candidate),
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

export function dedupeById(entries = []) {
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

export function sortByCentrality(entries = []) {
  return [...entries].sort((left, right) =>
    (right?.centralityScore || 0) - (left?.centralityScore || 0)
      || (right?.propagationScore || 0) - (left?.propagationScore || 0)
      || String(left?.id || '').localeCompare(String(right?.id || ''))
  );
}

export function buildToolingSection(toolInventory = null) {
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

export function buildInventoryState(summary = {}) {
  if (summary.surfaceAuditTrustworthy === false || summary.dataGatewayTrustworthy === false) {
    return 'watching';
  }

  if ((summary.integrationCoveragePct || 0) > 0 && (summary.integrationCoveragePct || 0) < 80) {
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

export function buildInventorySummary({
  canonicalSurfaces = [],
  canonicalEntrypoints = [],
  emergentSystems = [],
  bridgeSystems = [],
  wrapperSystems = [],
  legacySystems = [],
  tooling = {},
  signals = {},
  policyCoverage = null
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
  const kindCounts = allSystems.reduce((acc, entry) => {
    const kind = entry?.systemKind || 'unknown';
    acc[kind] = (acc[kind] || 0) + 1;
    return acc;
  }, {});
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
    integrationCoveragePct: asNumber(signals.integrationCoveragePct, 0),
    propagationExpansionState: signals.propagationExpansionState || null,
    dominantToolCategory: toolHubCategory,
    dominantToolSubgroup: toolHubSubgroup,
    toolConcentration: tooling.concentration || 0,
    toolCategoryConcentration: tooling.categoryConcentration || 0,
    noiseScore: tooling.noiseScore || 0,
    noisyToolCount: tooling.noisyToolCount || 0,
    policyCoverageState: policyCoverage?.coverageState || null,
    policyCoverageScore: asNumber(policyCoverage?.coverageScore, 0),
    policyCoverageRatio: asNumber(policyCoverage?.coverageRatio, 0),
    policyCoverageDriftCount: asNumber(policyCoverage?.policyDriftCount, 0),
    policyCoveragePropagationState: policyCoverage?.propagationExpansionState || null,
    kindCounts,
    nextAction:
      topPromotionCandidates[0]?.recommendedAction
      || signals.nextAction
      || policyCoverage?.nextAction
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
    `integration=${Math.round(summary.integrationCoveragePct || 0)}%`,
    `tools=${tooling.totalTools}`,
    `noise=${summary.noisyToolCount}/${Math.round(summary.noiseScore)}`,
    `coverage=${summary.policyCoverageState || 'watching'}:${summary.policyCoverageScore}`,
    `state=${summary.inventoryState}`,
    `next=${summary.nextAction}`
  ].join(' | ');

  return {
    ...summary,
    topSystems,
    topPromotionCandidates
  };
}
