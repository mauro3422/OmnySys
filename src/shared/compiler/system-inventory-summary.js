/**
 * Canonical system inventory for emergent APIs, contract surfaces and hubs.
 *
 * This inventory is intentionally broader than MCP tool inventory. It groups
 * compiler/runtime surfaces into canonical, bridge, wrapper, legacy and
 * emergent candidates so downstream status and health surfaces can answer:
 * "what systems exist, what is emerging, and what should be promoted next?"
 */

import { asNumber } from './core-utils.js';
import { buildCompilerPolicyCoverageSummary } from './policy-coverage-summary.js';
import {
  buildCandidateEntry,
  buildInventoryState,
  buildInventorySummary,
  buildSurfaceInventoryEntry,
  buildToolingSection,
  dedupeById,
  deriveRoleFromSurface,
  sortByCentrality
} from './system-inventory-summary-helpers.js';

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
  const policyCoverage = compilerExplainability?.policyCoverage || buildCompilerPolicyCoverageSummary({
    inventory: {
      summary: {
        inventoryState: 'watching',
        totalSystemCount: canonicalSurfaceEntries.length + canonicalEntrypointEntries.length + emergentSystems.length + bridgeSystems.length + wrapperSystems.length + legacySystems.length,
        canonicalSurfaceCount: canonicalSurfaceEntries.length,
        canonicalEntrypointCount: canonicalEntrypointEntries.length,
        emergentSystemCount: emergentSystems.length,
        bridgeSystemCount: bridgeSystems.length,
        wrapperSystemCount: wrapperSystems.length,
        legacySystemCount: legacySystems.length,
        policyDriftCount: asNumber(policySummary?.total, 0),
        propagationExpansionState:
          driftAssessment?.signals?.find((signal) => signal?.key === 'propagation_expansion')?.state
          || driftAssessment?.primaryIssue?.state
          || null,
        nextAction:
          standardization?.summary?.nextAction
          || contractLayer?.summary?.nextAction
          || driftAssessment?.primaryIssue?.recommendation
          || null
      }
    },
    explainability: {
      driftAssessment
    }
  });
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
    signals,
    policyCoverage
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
    policyCoverage,
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
    policyCoverageState: summary.policyCoverageState || null,
    policyCoverageScore: summary.policyCoverageScore || 0,
    policyCoverageRatio: summary.policyCoverageRatio || 0,
    policyCoverageDriftCount: summary.policyCoverageDriftCount || 0,
    policyCoveragePropagationState: summary.policyCoveragePropagationState || null,
    nextAction: summary.nextAction || null,
    summaryText: summary.summaryText || null,
    topSystems: Array.isArray(summary.topSystems) ? summary.topSystems.slice(0, 8) : [],
    topPromotionCandidates: Array.isArray(summary.topPromotionCandidates) ? summary.topPromotionCandidates.slice(0, 5) : [],
    tooling: inventory.tooling || null,
    policyCoverage: inventory.policyCoverage || null
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
