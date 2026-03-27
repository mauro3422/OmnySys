/**
 * @fileoverview Conceptual duplicate runtime metrics helpers.
 *
 * @module shared/compiler/compiler-runtime-metrics-duplicates
 */

export function collectConceptualDuplicateMetrics(repo, options = {}) {
  const empty = {
    actionableGroups: 0,
    actionableImplementations: 0,
    rawGroups: 0,
    rawImplementations: 0,
    actionableRatio: 0,
    noiseByClass: {}
  };

  if (!repo) {
    return empty;
  }

  try {
    const conceptualSummary = repo.getConceptualDuplicateStats
      ? repo.getConceptualDuplicateStats(options)
      : repo.findConceptualDuplicates?.(options)?.summary || null;

    if (!conceptualSummary) {
      return empty;
    }

    const actionableGroups = conceptualSummary.actionable?.groupCount || 0;
    const rawGroups = conceptualSummary.raw?.groupCount || 0;

    return {
      actionableGroups,
      actionableImplementations: conceptualSummary.actionable?.implementationCount || 0,
      rawGroups,
      rawImplementations: conceptualSummary.raw?.implementationCount || 0,
      actionableRatio: rawGroups > 0
        ? Number((actionableGroups / rawGroups).toFixed(3))
        : 0,
      noiseByClass: conceptualSummary.noiseByClass || {}
    };
  } catch {
    return empty;
  }
}
