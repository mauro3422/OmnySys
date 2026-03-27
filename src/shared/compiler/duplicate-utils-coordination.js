/**
 * @fileoverview Duplicate finding coordination helpers.
 *
 * @module shared/compiler/duplicate-utils-coordination
 */

import { getRecommendation } from './recommendations/RecommendationEngine.js';

function buildDuplicateOverlapDetails(structuralFindings, conceptualFindings) {
  const structuralSymbols = new Set(structuralFindings.map((finding) => finding.symbol));
  const conceptualSymbols = new Set(conceptualFindings.map((finding) => finding.symbol));
  const overlap = [...structuralSymbols].filter((symbol) => conceptualSymbols.has(symbol));

  return overlap.map((symbol) => {
    const structuralCount = structuralFindings.filter((finding) => finding.symbol === symbol).length;
    const conceptualCount = conceptualFindings.filter((finding) => finding.symbol === symbol).length;

    return {
      symbol,
      structuralCount,
      conceptualCount,
      totalInstances: structuralCount + conceptualCount,
      recommendation: getRecommendation({ type: 'nested_duplicate' }).message,
      suggestedAction: `Consolidate all ${structuralCount + conceptualCount} variants into a single canonical implementation`
    };
  });
}

function buildDuplicateRemediationPlan(structuralFindings, conceptualFindings) {
  const plan = [];

  if (structuralFindings.length > 0) {
    plan.push({
      phase: 1,
      type: 'structural',
      action: 'Resolve DNA/structural duplicates first (identical implementation)',
      count: structuralFindings.length
    });
  }

  if (conceptualFindings.length > 0) {
    plan.push({
      phase: 2,
      type: 'conceptual',
      action: 'Review conceptual duplicates (same purpose, different implementation)',
      count: conceptualFindings.length
    });
  }

  return plan;
}

function resolveDuplicatePriority(overlapDetails) {
  return overlapDetails.length > 0 ? 'structural-critical' : 'structural';
}

export function coordinateDuplicateFindings(structuralFindings = [], conceptualFindings = []) {
  const overlapDetails = (
    structuralFindings.length > 0 && conceptualFindings.length > 0
  ) ? buildDuplicateOverlapDetails(structuralFindings, conceptualFindings) : [];

  return {
    structural: structuralFindings,
    conceptual: conceptualFindings,
    hasOverlap: overlapDetails.length > 0,
    overlapDetails,
    totalFindings: structuralFindings.length + conceptualFindings.length,
    priority: resolveDuplicatePriority(overlapDetails),
    combinedRemediation: buildDuplicateRemediationPlan(structuralFindings, conceptualFindings)
  };
}
