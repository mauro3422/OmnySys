import { takeSample } from '../sample-helpers.js';

export function compactCandidateReport(candidateReport = null) {
  if (!candidateReport) return null;
  return {
    candidateCount: candidateReport.candidateCount,
    topCandidates: takeSample(candidateReport.topCandidates || [], 3)
  };
}

export function compactFamilyState(familyState = null) {
  if (!familyState) return null;
  return {
    totalFamilies: familyState.totalFamilies,
    stateCounts: familyState.stateCounts,
    topFamilies: takeSample(familyState.topFamilies || [], 3)
  };
}

export function compactMigrationPlans(migrationPlans = null) {
  if (!migrationPlans) return null;
  return {
    candidateCount: migrationPlans.candidateCount,
    focusDecision: migrationPlans.focusCandidate?.decision || null
  };
}

export function compactNaming(naming = null) {
  if (!naming) return null;
  return {
    familyCount: naming.familyCount,
    renameTargetCount: naming.renameTargetCount,
    topFamilies: takeSample(naming.topFamilies || [], 3)
  };
}

export function compactNamingPatterns(namingPatterns = null) {
  if (!namingPatterns) return null;
  return {
    totalFamilies: namingPatterns.totalFamilies,
    totalTargets: namingPatterns.totalTargets,
    patternCounts: namingPatterns.patternCounts,
    topFamilyPatterns: takeSample(namingPatterns.topFamilyPatterns || [], 3),
    topRecommendedStems: takeSample(namingPatterns.topRecommendedStems || [], 5)
  };
}

export function compactCreationGuidance(creationGuidance = null) {
  if (!creationGuidance) return null;
  return {
    mode: creationGuidance.mode,
    scopePath: creationGuidance.scopePath || null,
    focusPath: creationGuidance.focusPath || null,
    matchedBy: creationGuidance.matchedBy || 'global',
    familyDomain: creationGuidance.familyDomain || null,
    barrelPolicy: creationGuidance.barrelPolicy || null,
    helperPolicy: creationGuidance.helperPolicy || null,
    collisionPolicy: creationGuidance.collisionPolicy || null,
    selectionReason: creationGuidance.selectionReason || null,
    preferredFolder: creationGuidance.preferredFolder,
    preferredFamilyRoot: creationGuidance.preferredFamilyRoot,
    preferredDirectory: creationGuidance.preferredDirectory,
    preferredRoleStems: takeSample(creationGuidance.preferredRoleStems || [], 5),
    familyExamples: takeSample(creationGuidance.familyExamples || [], 3),
    guidance: creationGuidance.guidance
  };
}

function compactFolderizationAutomationBase(automation = null) {
  if (!automation) return null;
  return {
    automationState: automation.automationState || null,
    executionMode: automation.executionMode || null,
    shouldExecute: automation.shouldExecute === true,
    executionTarget: automation.executionTarget || null,
    confidence: automation.confidence || 0,
    riskScore: automation.riskScore || 0,
    decision: automation.decision || null,
    propagationMode: automation.propagationMode || null,
    propagationCacheHit: Boolean(automation.propagationCacheHit),
    normalizationSafetyLevel: automation.normalizationSafetyLevel || null,
    normalizationAction: automation.normalizationAction || null,
    normalizationTargets: automation.normalizationTargets || 0,
    normalizationDensity: automation.normalizationDensity || 0
  };
}

function compactPropagationAdoption(adoption = null) {
  if (!adoption) return null;
  return {
    adoptionState: adoption.adoptionState || null,
    coverageRatio: adoption.coverageRatio || 0,
    requiredSystemCount: adoption.requiredSystemCount || 0,
    surfacedSystemCount: adoption.surfacedSystemCount || 0,
    missingSystemCount: adoption.missingSystemCount || 0,
    requiredSystemNames: takeSample(adoption.requiredSystemNames || [], 8),
    surfacedSystemNames: takeSample(adoption.surfacedSystemNames || [], 8),
    missingSystemNames: takeSample(adoption.missingSystemNames || [], 8),
    nextAction: adoption.nextAction || null,
    reason: adoption.reason || null,
    summaryText: adoption.summaryText || null
  };
}

function compactFolderizationAutomationSignals(automation = null) {
  if (!automation) return null;
  return {
    policyCoverageState: automation.policyCoverageState || null,
    promotionState: automation.promotionState || null,
    systemInventoryState: automation.systemInventoryState || null,
    propagationAdoption: compactPropagationAdoption(automation.propagationAdoption || null),
    driftState: automation.driftState || null,
    driftScore: automation.driftScore || 0,
    nextAction: automation.nextAction || null,
    reason: automation.reason || null,
    connectedSystemCount: automation.connectedSystemCount || 0,
    connectedSystems: takeSample(automation.connectedSystems || [], 8),
    connectedSystemNames: takeSample(automation.connectedSystemNames || [], 8)
  };
}

export function compactFolderizationAutomation(automation = null) {
  return {
    ...compactFolderizationAutomationBase(automation),
    ...compactFolderizationAutomationSignals(automation)
  };
}

function compactPropagationBase(propagation = null) {
  if (!propagation) return null;
  return {
    changeType: propagation.changeType || 'folderization',
    cacheKey: propagation.cacheKey || null,
    cacheHit: Boolean(propagation.cacheHit),
    decision: propagation.decision || null,
    mode: propagation.mode || null,
    moveTargetCount: propagation.moveTargetCount || 0,
    impactedFileCount: propagation.impactedFileCount || 0,
    rewriteCount: propagation.rewriteCount || 0,
    renameTargetCount: propagation.renameTargetCount || 0,
    validationTargetCount: propagation.validationTargetCount || 0,
    hasCrossFamilyPropagation: propagation.hasCrossFamilyPropagation || false
  };
}

function compactPropagationSignals(propagation = null) {
  if (!propagation) return null;
  return {
    topImpactedFiles: takeSample(propagation.topImpactedFiles || [], 3),
    topCandidates: takeSample(propagation.topCandidates || [], 3),
    candidateCount: propagation.candidateCount || 0,
    flatFamilies: propagation.flatFamilies || 0,
    mixedFamilies: propagation.mixedFamilies || 0,
    alreadyFolderizedFamilies: propagation.alreadyFolderizedFamilies || 0,
    guidance: propagation.guidance || null,
    recommendationStrategy: propagation.recommendationStrategy || null,
    scopePath: propagation.scopePath || null,
    focusPath: propagation.focusPath || null,
    connectedSystems: takeSample(propagation.connectedSystems || [], 8)
  };
}

export function compactPropagation(propagation = null) {
  return {
    ...compactPropagationBase(propagation),
    ...compactPropagationSignals(propagation)
  };
}

export function compactFolderization(folderization = null) {
  if (!folderization) return null;
  return {
    candidateReport: compactCandidateReport(folderization.candidateReport),
    familyState: compactFamilyState(folderization.familyState),
    migrationPlans: compactMigrationPlans(folderization.migrationPlans),
    naming: compactNaming(folderization.naming),
    namingPatterns: compactNamingPatterns(folderization.namingPatterns),
    creationGuidance: compactCreationGuidance(folderization.creationGuidance),
    propagation: compactPropagation(folderization.propagation),
    automation: compactFolderizationAutomation(folderization.automation),
    namingDebt: folderization.namingDebt ? {
      familyCount: folderization.namingDebt.familyCount,
      renameTargetCount: folderization.namingDebt.renameTargetCount,
      renameTargetDensity: folderization.namingDebt.renameTargetDensity
    } : null,
    summary: folderization.summary || null
  };
}
