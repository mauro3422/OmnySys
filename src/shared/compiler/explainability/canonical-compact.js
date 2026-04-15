import { takeSample } from '../sample-helpers.js';

function resolveSummaryField(source, field, fallback = null) {
  return source?.summary?.[field] ?? source?.[field] ?? fallback;
}

export function compactCanonicalPromotion(canonicalPromotion = null) {
  return {
    ...compactCanonicalPromotionBase(canonicalPromotion),
    ...compactCanonicalPromotionSignals(canonicalPromotion)
  };
}

function compactCanonicalPromotionBase(canonicalPromotion = null) {
  if (!canonicalPromotion) return null;
  return {
    promotionState: resolveSummaryField(canonicalPromotion, 'promotionState', null),
    inventoryState: resolveSummaryField(canonicalPromotion, 'inventoryState', null),
    folderizationState: resolveSummaryField(canonicalPromotion, 'folderizationState', null),
    folderizationDecision: resolveSummaryField(canonicalPromotion, 'folderizationDecision', null),
    candidateCount: resolveSummaryField(canonicalPromotion, 'candidateCount', 0),
    folderizedFamilyCount: resolveSummaryField(canonicalPromotion, 'folderizedFamilyCount', 0),
    emergentCandidateCount: resolveSummaryField(canonicalPromotion, 'emergentCandidateCount', 0),
    canonicalCandidateCount: resolveSummaryField(canonicalPromotion, 'canonicalCandidateCount', 0)
  };
}

function compactCanonicalPromotionSignals(canonicalPromotion = null) {
  if (!canonicalPromotion) return null;
  return {
    nextAction: resolveSummaryField(canonicalPromotion, 'nextAction', null),
    summaryText: resolveSummaryField(canonicalPromotion, 'summaryText', null),
    topPromotionTargets: takeSample(canonicalPromotion.topPromotionTargets || [], 5)
  };
}

export function compactPolicyCoverage(policyCoverage = null) {
  return {
    ...compactPolicyCoverageBase(policyCoverage),
    ...compactPolicyCoverageSignals(policyCoverage)
  };
}

function compactPolicyCoverageBase(policyCoverage = null) {
  if (!policyCoverage) return null;
  return {
    coverageState: resolveSummaryField(policyCoverage, 'coverageState', null),
    coverageScore: resolveSummaryField(policyCoverage, 'coverageScore', 0),
    coverageRatio: resolveSummaryField(policyCoverage, 'coverageRatio', 0),
    coverageLoad: resolveSummaryField(policyCoverage, 'coverageLoad', 0),
    totalSystemCount: resolveSummaryField(policyCoverage, 'totalSystemCount', 0),
    canonicalSurfaceCount: resolveSummaryField(policyCoverage, 'canonicalSurfaceCount', 0),
    canonicalEntrypointCount: resolveSummaryField(policyCoverage, 'canonicalEntrypointCount', 0),
    bridgeSystemCount: resolveSummaryField(policyCoverage, 'bridgeSystemCount', 0),
    wrapperSystemCount: resolveSummaryField(policyCoverage, 'wrapperSystemCount', 0),
    emergentSystemCount: resolveSummaryField(policyCoverage, 'emergentSystemCount', 0),
    policyDriftCount: resolveSummaryField(policyCoverage, 'policyDriftCount', 0),
    propagationExpansionState: resolveSummaryField(policyCoverage, 'propagationExpansionState', null),
    propagationExpansionReason: resolveSummaryField(policyCoverage, 'propagationExpansionReason', null),
    propagationExpansionRecommendation: resolveSummaryField(policyCoverage, 'propagationExpansionRecommendation', null)
  };
}

function compactPolicyCoverageSignals(policyCoverage = null) {
  if (!policyCoverage) return null;
  return {
    nextAction: resolveSummaryField(policyCoverage, 'nextAction', null),
    recommendation: resolveSummaryField(policyCoverage, 'recommendation', null),
    summaryText: resolveSummaryField(policyCoverage, 'summaryText', null),
    inventoryState: resolveSummaryField(policyCoverage, 'inventoryState', null),
    topSystems: takeSample(policyCoverage.topSystems || [], 5),
    topPromotionTargets: takeSample(policyCoverage.topPromotionTargets || [], 5)
  };
}
