import { buildFolderizationReportFromRepo, buildFolderizationReportFromRows } from './folderization-report.js';
import {
  normalizeConnectedSystems,
  normalizeInventorySystems,
  buildPropagationAdoptionSummary,
  calculateConfidence,
  calculateConfidenceForBlocked,
  buildAutomationReason,
  buildExecutionTarget
} from './folderization-automation-utils.js';

export function buildFolderizationAutomationSummaryFromReport(folderizationReport = null, context = {}) {
  if (!folderizationReport || typeof folderizationReport !== 'object') {
    return null;
  }

  const propagation = folderizationReport.propagation || {};
  const normalization = folderizationReport.normalization || {};
  const drift = folderizationReport.drift || {};
  const policyCoverage = context.policyCoverage || context.systemInventory?.policyCoverage || null;
  const canonicalPromotion = context.canonicalPromotion || context.systemInventory?.canonicalPromotion || null;
  const connectedSystems = normalizeConnectedSystems(propagation.connectedSystems || []);
  const connectedSystemNames = connectedSystems.map((item) => item.name);
  const propagationAdoption = buildPropagationAdoptionSummary({
    connectedSystems,
    requiredSystems: context.propagationAdoptionRequiredSystems || context.requiredSystems || [],
    surfacedSystems: context.propagationAdoptionTargets || context.surfacedSystems || []
  });
  const normalizationSafetyLevel = normalization.summary?.safetyLevel || 'none';
  const normalizationAction = normalization.summary?.recommendedAction || 'noop';
  const normalizationTargets = Number(normalization.summary?.renameTargetCount || 0);
  const normalizationDensity = Number(normalization.summary?.renameTargetDensity || 0);
  const propagationMode = propagation.mode || 'blocked';
  const propagationDecision = propagation.decision || folderizationReport.decision || 'reject';
  const recommendationStrategy = propagation.recommendationStrategy || folderizationReport.recommendation?.strategy || null;
  const contractDrift = folderizationReport.contractDrift || {};
  const policyCoverageState = policyCoverage?.coverageState || policyCoverage?.state || null;
  const promotionState = canonicalPromotion?.promotionState || canonicalPromotion?.summary?.promotionState || null;
  const systemInventoryState = context.systemInventory?.inventoryState || context.systemInventory?.summary?.inventoryState || null;
  const automationState = folderizationReport.decision === 'already_folderized'
    ? 'already_folderized'
    : propagationMode === 'blocked' || drift.state === 'blocked' || contractDrift.state === 'blocked' || normalizationSafetyLevel === 'missing'
      ? 'blocked'
      : contractDrift.state === 'stale' || drift.state === 'stale' || normalizationSafetyLevel === 'risky'
        ? 'review'
      : normalizationAction === 'execute' && propagationMode === 'move_and_rewrite' && normalizationSafetyLevel === 'safe' && propagationAdoption.adoptionState === 'ready'
        ? 'ready'
        : 'review';
  const confidence = automationState === 'blocked'
    ? calculateConfidenceForBlocked({
        normalizationSafetyLevel,
        fileCohesion: folderizationReport.cohesion?.score || 0,
        namingPatternConsistency: folderizationReport.namingPattern?.consistency || 0,
        importDensity: folderizationReport.importAnalysis?.density || 0,
        sharedPrefixStrength: folderizationReport.prefixAnalysis?.strength || 0,
        externalDependencyCount: folderizationReport.dependencyAnalysis?.externalCount || 0
      })
    : calculateConfidence({
        automationState,
        normalizationSafetyLevel,
        policyCoverageState,
        promotionState,
        connectedSystemCount: connectedSystems.length,
        // Nuevas señales de metadata del report
        fileCohesion: folderizationReport.cohesion?.score || 0,
        namingPatternConsistency: folderizationReport.namingPattern?.consistency || 0,
        importDensity: folderizationReport.importAnalysis?.density || 0,
        sharedPrefixStrength: folderizationReport.prefixAnalysis?.strength || 0,
        externalDependencyCount: folderizationReport.dependencyAnalysis?.externalCount || 0
      });
  const riskScore = Math.max(0, 100 - confidence + (normalizationSafetyLevel === 'risky' ? 10 : 0) + Math.round((contractDrift.score || 0) * 0.2));
  const shouldExecute = automationState === 'ready';
  const executionTarget = buildExecutionTarget({
    decision: folderizationReport.decision,
    automationState,
    normalizationSafetyLevel,
    recommendationStrategy
  });
  const nextAction = shouldExecute
    ? `Execute ${executionTarget} using the propagation plan and connected systems.`
    : automationState === 'already_folderized'
      ? 'Reuse the existing folderized family and only rename within the family if needed.'
      : contractDrift.state === 'blocked'
        ? contractDrift.recommendation || 'Repair the folderization transaction contract before execution.'
      : contractDrift.state === 'stale'
        ? contractDrift.recommendation || 'Normalize the folderization transaction contract before execution.'
      : executionTarget === 'split_large_file'
        ? 'Use split_large_file to decompose the monolith before retrying folderization.'
      : automationState === 'review'
        ? (propagationAdoption.missingSystemCount > 0
          ? `Update ${propagationAdoption.missingSystemNames.slice(0, 3).join(', ')} to surface the propagation pattern before execution.`
          : 'Review the propagation and normalization plan before execution.')
        : 'Repair support surfaces before attempting folderization automation.';
  const reason = buildAutomationReason({
    automationState,
    decision: folderizationReport.decision,
    propagationMode,
    normalizationSafetyLevel,
    policyCoverageState,
    promotionState,
    connectedSystemNames,
    propagationAdoption,
    driftReason: contractDrift.reason || drift.reason || null,
    recommendationStrategy: propagation.recommendationStrategy || folderizationReport.recommendation?.strategy || null
  });

  return {
    automationState,
    executionMode: shouldExecute ? 'execute' : automationState === 'blocked' ? 'analyze' : 'plan',
    shouldExecute,
    executionTarget,
    confidence,
    riskScore,
    decision: folderizationReport.decision || 'reject',
    propagationChangeType: propagation.changeType || 'folderization',
    propagationMode,
    propagationDecision,
    propagationCacheKey: propagation.cacheKey || null,
    propagationCacheHit: Boolean(propagation.cacheHit),
    propagationValidationTargets: Number(propagation.validationTargetCount || 0),
    normalizationSafetyLevel,
    normalizationAction,
    normalizationTargets,
    normalizationDensity,
    policyCoverageState,
    promotionState,
    systemInventoryState,
    propagationAdoption,
    propagationAdoptionState: propagationAdoption.adoptionState,
    propagationAdoptionCoverageRatio: propagationAdoption.coverageRatio,
    propagationAdoptionRequiredSystemCount: propagationAdoption.requiredSystemCount,
    propagationAdoptionSurfacedSystemCount: propagationAdoption.surfacedSystemCount,
    propagationAdoptionMissingSystemCount: propagationAdoption.missingSystemCount,
    propagationAdoptionRequiredSystems: propagationAdoption.requiredSystems,
    propagationAdoptionSurfacedSystems: propagationAdoption.surfacedSystems,
    propagationAdoptionMissingSystems: propagationAdoption.missingSystems,
    contractDriftState: contractDrift.state || 'fresh',
    contractDriftScore: Number(contractDrift.score || 0),
    contractDriftReason: contractDrift.reason || null,
    contractDriftRecommendation: contractDrift.recommendation || null,
    contractDriftEvidence: contractDrift.evidence || null,
    driftState: drift.state || 'fresh',
    driftScore: Number(drift.score || 0),
    driftReason: drift.reason || null,
    recommendationStrategy,
    connectedSystemCount: connectedSystems.length,
    connectedSystems,
    connectedSystemNames,
    scopePath: folderizationReport.scopePath || null,
    focusPath: folderizationReport.focusPath || null,
    candidateCount: Number(folderizationReport.candidateReport?.candidateCount || 0),
    nextAction,
    reason
  };
}

export function buildFolderizationAutomationSummaryFromRows(rows = [], options = {}, context = {}) {
  const report = buildFolderizationReportFromRows(rows, options);
  return buildFolderizationAutomationSummaryFromReport(report, context);
}

export function buildFolderizationAutomationSummaryFromRepo(repo, options = {}, context = {}) {
  const report = buildFolderizationReportFromRepo(repo, options);
  return buildFolderizationAutomationSummaryFromReport(report, context);
}

export default {
  buildFolderizationAutomationSummaryFromReport,
  buildFolderizationAutomationSummaryFromRows,
  buildFolderizationAutomationSummaryFromRepo
};
