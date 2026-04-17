/**
 * Tool: mcp_omnysystem_get_system_inventory_report
 *
 * Returns the canonical system inventory for emergent APIs, canonical
 * surfaces, bridges and wrappers, along with the compact report used by
 * status/health consumers.
 */

import { createLogger } from '../../../utils/logger.js';
import {
  buildCanonicalPromotionReport,
  buildCanonicalPromotionSnapshot,
  buildCompilerSystemInventoryReport,
  buildCompilerSystemInventorySnapshot
} from '../../../shared/compiler/index.js';
import { buildCompilerSnapshotContext } from './compiler-snapshot-service/index.js';

const logger = createLogger('OmnySys:system-inventory');

function buildCompactSystemInventoryReport(result) {
  const inventory = result?.systemInventory || {};
  return {
    inventoryState: inventory.inventoryState || null,
    totalSystemCount: inventory.totalSystemCount ?? 0,
    canonicalSurfaceCount: inventory.canonicalSurfaceCount ?? 0,
    canonicalEntrypointCount: inventory.canonicalEntrypointCount ?? 0,
    bridgeSystemCount: inventory.bridgeSystemCount ?? 0,
    wrapperSystemCount: inventory.wrapperSystemCount ?? 0,
    legacySystemCount: inventory.legacySystemCount ?? 0,
    hubSystemCount: inventory.hubSystemCount ?? 0,
    policyDriftCount: inventory.policyDriftCount ?? 0,
    integrationCoveragePct: inventory.integrationCoveragePct ?? 0,
    metadataCoveragePct: inventory.metadataCoveragePct ?? 0,
    propagationExpansionState: inventory.propagationExpansionState || null,
    policyCoverageState: inventory.policyCoverageState || null,
    policyCoverageScore: inventory.policyCoverageScore ?? 0,
    summaryText: inventory.summaryText || null,
    nextAction: inventory.nextAction || null
  };
}

function buildCompactSystemsList(systems = [], limit = 8) {
  return Array.isArray(systems)
    ? systems.slice(0, limit).map((system) => ({
      id: system?.id || system?.surface || system?.entrypoint || null,
      kind: system?.kind || null,
      role: system?.role || null,
      status: system?.status || null,
      summary: system?.summary || null,
      recommendedAction: system?.recommendedAction || null
    })).filter((system) => system.id)
    : [];
}

function buildCompactExplainabilitySummary(result) {
  const explainability = result?.compilerExplainability || {};
  return {
    _algebraic: Boolean(explainability._algebraic),
    standardization: explainability.standardization?.summary ? {
      nextAction: explainability.standardization.summary.nextAction || null,
      adoptionGapCount: explainability.standardization.summary.adoptionGapCount || 0,
      missingCanonicalApiCount: explainability.standardization.summary.missingCanonicalApiCount || 0,
      missingCanonicalSurfaceCount: explainability.standardization.summary.missingCanonicalSurfaceCount || 0
    } : null,
    compilerContractLayer: explainability.compilerContractLayer?.summary ? {
      nextAction: explainability.compilerContractLayer.summary.nextAction || null,
      canonicalSurfaceCount: explainability.compilerContractLayer.summary.canonicalSurfaceCount || 0,
      canonicalEntrypointCount: explainability.compilerContractLayer.summary.canonicalEntrypointCount || 0
    } : null,
    canonicalPromotion: result?.canonicalPromotion?.summaryText ? {
      summaryText: result.canonicalPromotion.summaryText,
      candidateCount: result.canonicalPromotion.candidateCount || 0,
      nextAction: result.canonicalPromotion.nextAction || null
    } : null,
    controlPlane: explainability.controlPlane?.summary ? {
      summaryText: explainability.controlPlane.summary.summaryText || null,
      state: explainability.controlPlane.summary.state || null
    } : null,
    surfaceAudit: explainability.surfaceAudit?.summary ? {
      trustworthy: explainability.surfaceAudit.summary.trustworthy === true,
      summaryText: explainability.surfaceAudit.summary.summaryText || null
    } : null,
    driftAssessment: explainability.driftAssessment?.summary ? {
      summaryText: explainability.driftAssessment.summary.summaryText || null,
      primaryIssue: explainability.driftAssessment.primaryIssue || null
    } : null
  };
}

function buildSystemInventoryResponse(result, includeDetails = false) {
  const compactReport = buildCompactSystemInventoryReport(result);
  const sourceTopSystems = result.systemInventoryDetail?.topSystems || result.systemInventory?.topSystems || [];
  const sourcePromotionCandidates = result.systemInventoryDetail?.topPromotionCandidates || result.systemInventory?.topPromotionCandidates || [];
  const compactTopSystems = buildCompactSystemsList(sourceTopSystems, includeDetails ? 12 : 5);
  const compactPromotionCandidates = buildCompactSystemsList(sourcePromotionCandidates, includeDetails ? 12 : 5);
  return {
    success: true,
    aggregationType: 'system_inventory',
    inventory: includeDetails ? (result.systemInventoryDetail || null) : compactReport,
    detail: includeDetails ? (result.systemInventoryDetail || null) : null,
    report: includeDetails ? (result.systemInventory || null) : compactReport,
    propagation: result.canonicalPromotionDetail?.folderization?.propagation
      || result.compactSnapshot?.current?.folderizationPropagation
      || result.compactSnapshot?.folderizationPropagation
      || null,
    snapshot: result.compactSnapshot,
    dashboard: result.healthDashboard,
    observability: result.observability || null,
    controlPlane: result.controlPlane || null,
    summary: result.systemInventory?.summaryText || result.systemInventory?.summary?.summaryText || null,
    topSystems: includeDetails ? (result.systemInventory?.topSystems || []) : compactTopSystems,
    promotionCandidates: includeDetails ? (result.systemInventory?.topPromotionCandidates || []) : compactPromotionCandidates,
    canonicalPromotionDetail: includeDetails ? (result.canonicalPromotionDetail || null) : null,
    canonicalPromotion: includeDetails ? (result.canonicalPromotion || null) : (result.canonicalPromotion?.summaryText ? {
      promotionState: result.canonicalPromotion.promotionState || null,
      inventoryState: result.canonicalPromotion.inventoryState || null,
      candidateCount: result.canonicalPromotion.candidateCount || 0,
      folderizedFamilyCount: result.canonicalPromotion.folderizedFamilyCount || 0,
      emergentCandidateCount: result.canonicalPromotion.emergentCandidateCount || 0,
      canonicalCandidateCount: result.canonicalPromotion.canonicalCandidateCount || 0,
      nextAction: result.canonicalPromotion.nextAction || null,
      summaryText: result.canonicalPromotion.summaryText || null
    } : null),
    tooling: includeDetails ? (result.systemInventory?.tooling || null) : {
      totalTools: result.systemInventory?.tooling?.totalTools || 0,
      noisyToolCount: result.systemInventory?.tooling?.noisyToolCount || 0,
      concentration: result.systemInventory?.tooling?.concentration || 0,
      categoryConcentration: result.systemInventory?.tooling?.categoryConcentration || 0
    },
    compilerExplainability: includeDetails ? (result.compilerExplainability || null) : buildCompactExplainabilitySummary(result)
  };
}

function buildCachedSystemInventoryResult(args = {}, context = {}) {
  const server = context?.server || null;
  const sharedState = server?.sharedState || context?.sharedState || {};
  const materializedResult = sharedState.systemInventoryReport && sharedState.canonicalPromotionReport && sharedState.systemInventorySnapshot
    ? {
      success: true,
      compilerExplainability: sharedState.compilerExplainability || server?.liveInsights?.compilerExplainability || null,
      systemInventoryDetail: sharedState.systemInventorySnapshot,
      systemInventory: sharedState.systemInventoryReport,
      canonicalPromotionDetail: sharedState.canonicalPromotionSnapshot || null,
      canonicalPromotion: sharedState.canonicalPromotionReport,
      compactSnapshot: null,
      healthDashboard: null,
      observability: null,
      controlPlane: null
    }
    : null;
  if (materializedResult) {
    return materializedResult;
  }

  const liveInsightsExplainability = server?.liveInsights?.compilerExplainability
    || (server?.liveInsights?.systemInventory ? server.liveInsights : null);
  const compilerExplainability = liveInsightsExplainability
    || sharedState.compilerExplainability
    || null;

  if (!compilerExplainability) {
    return null;
  }

  if (sharedState.systemInventorySnapshot || sharedState.systemInventoryReport || sharedState.canonicalPromotionSnapshot || sharedState.canonicalPromotionReport) {
    return {
      success: true,
      compilerExplainability,
      systemInventoryDetail: sharedState.systemInventorySnapshot || compilerExplainability.systemInventory || null,
      systemInventory: sharedState.systemInventoryReport || null,
      canonicalPromotionDetail: sharedState.canonicalPromotionSnapshot || null,
      canonicalPromotion: sharedState.canonicalPromotionReport || null,
      compactSnapshot: null,
      healthDashboard: null,
      observability: null,
      controlPlane: null
    };
  }

  const projectPath = context?.projectPath || server?.projectPath || null;
  const scopePath = args?.scopePath || null;
  const focusPath = args?.focusPath || null;
  const systemInventoryDetail = compilerExplainability.systemInventory || buildCompilerSystemInventorySnapshot({
    projectPath,
    scopePath,
    focusPath,
    compilerExplainability,
    limit: 10
  });
  const systemInventory = buildCompilerSystemInventoryReport(systemInventoryDetail);
  const canonicalPromotionDetail = compilerExplainability.canonicalPromotion || buildCanonicalPromotionSnapshot({
    projectPath,
    scopePath,
    focusPath,
    systemInventory
  });

  return {
    success: true,
    compilerExplainability,
    systemInventoryDetail,
    systemInventory,
    canonicalPromotionDetail,
    canonicalPromotion: buildCanonicalPromotionReport(canonicalPromotionDetail),
    compactSnapshot: null,
    healthDashboard: null,
    observability: null,
    controlPlane: null
  };
}

export async function get_system_inventory_report(args, context) {
  logger.info('[Tool] get_system_inventory_report()');

  try {
    const includeDetails = args?.includeDetails === true;
    const cachedResult = buildCachedSystemInventoryResult(args, context);
    if (cachedResult) {
      logger.info('[Tool] get_system_inventory_report() cache hit from sharedState.compilerExplainability');
      return buildSystemInventoryResponse(cachedResult, includeDetails);
    }

    const result = await buildCompilerSnapshotContext(args, context, {
      captureSource: 'mcp.tool.get_system_inventory_report',
      snapshotKind: args?.snapshotKind || 'inventory'
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Project repository unavailable'
      };
    }

    return buildSystemInventoryResponse(result, includeDetails);
  } catch (error) {
    logger.error(`[Tool] get_system_inventory_report failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { get_system_inventory_report };
