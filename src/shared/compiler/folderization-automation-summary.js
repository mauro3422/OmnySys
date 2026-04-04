import { buildFolderizationReportFromRepo, buildFolderizationReportFromRows } from './folderization-report.js';
import { takeSample } from './sample-helpers.js';

function normalizeConnectedSystems(connectedSystems = []) {
  return takeSample(
    (Array.isArray(connectedSystems) ? connectedSystems : [])
      .map((item) => {
        if (!item) return null;
        if (typeof item === 'string') {
          return { name: item, role: 'consumer' };
        }

        return {
          name: item.name || item.system || item.role || null,
          role: item.role || item.type || 'consumer'
        };
      })
      .filter((item) => item?.name),
    8
  );
}

function calculateConfidence({
  automationState,
  normalizationSafetyLevel,
  policyCoverageState,
  promotionState,
  connectedSystemCount
}) {
  if (automationState === 'already_folderized') {
    return 100;
  }

  if (automationState === 'ready') {
    return Math.min(100, 82 + Math.min(connectedSystemCount, 8) + (normalizationSafetyLevel === 'safe' ? 5 : 0));
  }

  if (automationState === 'review') {
    return Math.max(20, 58 - (normalizationSafetyLevel === 'risky' ? 10 : 0) - (policyCoverageState === 'stale' ? 5 : 0) - (promotionState === 'watching' ? 5 : 0));
  }

  return Math.max(0, 20 - (normalizationSafetyLevel === 'missing' ? 10 : 0));
}

function buildAutomationReason({
  automationState,
  decision,
  propagationMode,
  normalizationSafetyLevel,
  policyCoverageState,
  promotionState,
  connectedSystemNames,
  driftReason,
  recommendationStrategy
}) {
  if (automationState === 'already_folderized') {
    return 'Reuse the existing folderized family and normalize names only if the family is already stable.';
  }

  if (automationState === 'ready') {
    return `Folderization can execute because propagation is attached to ${connectedSystemNames.join(', ')} and the normalization plan is safe.`;
  }

  if (automationState === 'review') {
    return `Folderization should be reviewed because normalization is ${normalizationSafetyLevel} and policy coverage is ${policyCoverageState || 'unknown'}.`;
  }

  return driftReason
    ? `Folderization is blocked: ${driftReason}`
    : `Folderization is blocked because propagation=${propagationMode || 'blocked'} and recommendation=${recommendationStrategy || 'n/a'}.`;
}

function buildExecutionTarget({
  decision,
  automationState,
  normalizationSafetyLevel
}) {
  if (decision === 'already_folderized') {
    return 'rename_folderized_family';
  }

  if (automationState === 'ready' && normalizationSafetyLevel === 'safe') {
    return 'folderize_family';
  }

  if (decision === 'review') {
    return 'plan';
  }

  return 'analyze';
}

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
  const normalizationSafetyLevel = normalization.summary?.safetyLevel || 'none';
  const normalizationAction = normalization.summary?.recommendedAction || 'noop';
  const normalizationTargets = Number(normalization.summary?.renameTargetCount || 0);
  const normalizationDensity = Number(normalization.summary?.renameTargetDensity || 0);
  const propagationMode = propagation.mode || 'blocked';
  const propagationDecision = propagation.decision || folderizationReport.decision || 'reject';
  const policyCoverageState = policyCoverage?.coverageState || policyCoverage?.state || null;
  const promotionState = canonicalPromotion?.promotionState || canonicalPromotion?.summary?.promotionState || null;
  const systemInventoryState = context.systemInventory?.inventoryState || context.systemInventory?.summary?.inventoryState || null;
  const automationState = folderizationReport.decision === 'already_folderized'
    ? 'already_folderized'
    : propagationMode === 'blocked' || drift.state === 'blocked' || normalizationSafetyLevel === 'missing'
      ? 'blocked'
      : normalizationAction === 'execute' && propagationMode === 'move_and_rewrite' && normalizationSafetyLevel === 'safe'
        ? 'ready'
        : 'review';
  const confidence = calculateConfidence({
    automationState,
    normalizationSafetyLevel,
    policyCoverageState,
    promotionState,
    connectedSystemCount: connectedSystems.length
  });
  const riskScore = Math.max(0, 100 - confidence + (normalizationSafetyLevel === 'risky' ? 10 : 0));
  const shouldExecute = automationState === 'ready';
  const executionTarget = buildExecutionTarget({
    decision: folderizationReport.decision,
    automationState,
    normalizationSafetyLevel
  });
  const nextAction = shouldExecute
    ? `Execute ${executionTarget} using the propagation plan and connected systems.`
    : automationState === 'already_folderized'
      ? 'Reuse the existing folderized family and only rename within the family if needed.'
      : automationState === 'review'
        ? 'Review the propagation and normalization plan before execution.'
        : 'Repair support surfaces before attempting folderization automation.';
  const reason = buildAutomationReason({
    automationState,
    decision: folderizationReport.decision,
    propagationMode,
    normalizationSafetyLevel,
    policyCoverageState,
    promotionState,
    connectedSystemNames,
    driftReason: drift.reason || null,
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
    driftState: drift.state || 'fresh',
    driftScore: Number(drift.score || 0),
    driftReason: drift.reason || null,
    recommendationStrategy: propagation.recommendationStrategy || folderizationReport.recommendation?.strategy || null,
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
