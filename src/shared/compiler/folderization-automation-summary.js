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

function buildPropagationAdoptionSummary({
  connectedSystems = [],
  surfacedSystems = []
} = {}) {
  const requiredSystems = normalizeConnectedSystems(connectedSystems);
  const surfaced = normalizeConnectedSystems(surfacedSystems.length > 0 ? surfacedSystems : connectedSystems);
  const surfacedSystemNames = surfaced.map((item) => item.name);
  const surfacedNameSet = new Set(surfacedSystemNames);
  const adoptedSystems = requiredSystems.filter((item) => surfacedNameSet.has(item.name));
  const missingSystems = requiredSystems.filter((item) => !surfacedNameSet.has(item.name));
  const requiredSystemNames = requiredSystems.map((item) => item.name);
  const adoptedSystemNames = adoptedSystems.map((item) => item.name);
  const missingSystemNames = missingSystems.map((item) => item.name);
  const requiredSystemCount = requiredSystems.length;
  const surfacedSystemCount = adoptedSystems.length;
  const missingSystemCount = missingSystems.length;
  const coverageRatio = requiredSystemCount > 0
    ? Math.round((surfacedSystemCount / requiredSystemCount) * 100) / 100
    : 1;

  let adoptionState = 'ready';
  if (requiredSystemCount === 0) {
    adoptionState = 'ready';
  } else if (missingSystemCount === 0) {
    adoptionState = 'ready';
  } else if (coverageRatio >= 0.75) {
    adoptionState = 'watching';
  } else if (coverageRatio > 0) {
    adoptionState = 'stale';
  } else {
    adoptionState = 'blocked';
  }

  const surfacedLabel = surfacedSystemNames.length > 0
    ? surfacedSystemNames.join(', ')
    : 'no surfaced systems';
  const missingLabel = missingSystemNames.length > 0
    ? missingSystemNames.join(', ')
    : 'none';

  return {
    adoptionState,
    coverageRatio,
    requiredSystemCount,
    surfacedSystemCount,
    missingSystemCount,
    requiredSystems,
    surfacedSystems: surfaced,
    adoptedSystems,
    missingSystems,
    requiredSystemNames,
    surfacedSystemNames,
    adoptedSystemNames,
    missingSystemNames,
    nextAction: missingSystemCount > 0
      ? `Update ${missingSystemNames.slice(0, 3).join(', ')} to surface the propagation pattern.`
      : 'All connected systems already surface the propagation pattern.',
    reason: requiredSystemCount > 0
      ? `${surfacedSystemCount}/${requiredSystemCount} connected system(s) already surface the propagation pattern; missing=${missingLabel}.`
      : 'No connected systems were reported by the propagation plan.',
    summaryText: `state=${adoptionState} | coverage=${coverageRatio} | required=${requiredSystemCount} | surfaced=${surfacedSystemCount} | missing=${missingSystemCount} | surfacedSystems=${surfacedLabel}`,
    surfacedSystemLabels: surfacedLabel,
    missingSystemLabels: missingLabel
  };
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
  propagationAdoption,
  driftReason,
  recommendationStrategy
}) {
  if (automationState === 'already_folderized') {
    return 'Reuse the existing folderized family and normalize names only if the family is already stable.';
  }

  if (automationState === 'ready') {
    const connectedLabel = connectedSystemNames.length > 0 ? connectedSystemNames.join(', ') : 'the connected systems';
    return `Folderization can execute because propagation is attached to ${connectedLabel} and the normalization plan is safe; adoption is aligned across ${propagationAdoption?.surfacedSystemCount || 0} surfaced system(s).`;
  }

  if (automationState === 'review') {
    return propagationAdoption?.missingSystemCount > 0
      ? `Folderization should be reviewed because ${propagationAdoption.missingSystemNames.slice(0, 3).join(', ')} still need the propagation pattern and policy coverage is ${policyCoverageState || 'unknown'}.`
      : `Folderization should be reviewed because normalization is ${normalizationSafetyLevel} and policy coverage is ${policyCoverageState || 'unknown'}.`;
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
  const propagationAdoption = buildPropagationAdoptionSummary({
    connectedSystems,
    surfacedSystems: context.propagationAdoptionTargets || context.surfacedSystems || []
  });
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
      : normalizationAction === 'execute' && propagationMode === 'move_and_rewrite' && normalizationSafetyLevel === 'safe' && propagationAdoption.adoptionState === 'ready'
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
    propagationAdoption,
    propagationAdoptionState: propagationAdoption.adoptionState,
    propagationAdoptionCoverageRatio: propagationAdoption.coverageRatio,
    propagationAdoptionRequiredSystemCount: propagationAdoption.requiredSystemCount,
    propagationAdoptionSurfacedSystemCount: propagationAdoption.surfacedSystemCount,
    propagationAdoptionMissingSystemCount: propagationAdoption.missingSystemCount,
    propagationAdoptionRequiredSystems: propagationAdoption.requiredSystems,
    propagationAdoptionSurfacedSystems: propagationAdoption.surfacedSystems,
    propagationAdoptionMissingSystems: propagationAdoption.missingSystems,
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
