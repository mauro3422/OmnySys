import { loadCompilerExplainability } from '../loader.js';
import { buildCompilerSystemInventoryReport } from './summary.js';
import { buildCanonicalPromotionReport } from '../canonical-promotion-summary.js';

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

export async function buildCompilerSystemInventoryToolResponse(args = {}, context = {}) {
  const includeDetails = args?.includeDetails === true;
  const projectPath = context?.projectPath || context?.server?.projectPath || null;
  const compilerExplainability = await loadCompilerExplainability(
    projectPath,
    [],
    {},
    null,
    {
      scopePath: args?.scopePath || null,
      focusPath: args?.focusPath || null,
      forceFresh: true,
      forceFreshRepository: true
    }
  );
  const systemInventory = buildCompilerSystemInventoryReport(compilerExplainability.systemInventory || null);
  const canonicalPromotion = buildCanonicalPromotionReport(compilerExplainability.canonicalPromotion || null);

  const result = {
    success: true,
    _algebraic: Boolean(compilerExplainability._algebraic),
    capturedAt: new Date().toISOString(),
    compilerExplainability,
    systemInventoryDetail: compilerExplainability.systemInventory || null,
    systemInventory,
    canonicalPromotionDetail: compilerExplainability.canonicalPromotion || null,
    canonicalPromotion,
    healthDashboard: compilerExplainability.healthDashboard || null,
    compactSnapshot: {
      current: {
        totalAtoms: systemInventory?.totalSystemCount || 0,
        policyDriftCount: systemInventory?.policyDriftCount || 0,
        metadataCoverage: systemInventory?.metadataCoveragePct || 0
      }
    }
  };

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

export default {
  buildCompilerSystemInventoryToolResponse
};
