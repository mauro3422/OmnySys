export function getPerformanceAtoms(systemMap) {
  return Object.values(systemMap?.functions || {});
}

export function calculatePerformanceRisk(perf = {}) {
  let score = 0;
  if (perf.estimatedComplexity === 'O(n^3)') score += 60;
  else if (perf.estimatedComplexity === 'O(n^2)') score += 40;

  if (perf.blockingOperations?.length > 0) score += 30;
  if (perf.largeArrayOps?.length > 1) score += 20;

  return score;
}

export function buildPerformanceMessage(atom, perf = {}) {
  return `Potential performance bottleneck in "${atom.name}": Detected ${perf.estimatedComplexity} complexity with ${perf.blockingOperations?.length || 0} blocking ops.`;
}

export function buildPerformanceRecommendation(perf = {}) {
  if (perf.estimatedComplexity?.includes('n^')) {
    return 'Refactor nested loops or use more efficient data structures (Map/Set).';
  }

  if (perf.blockingOperations?.length > 0) {
    return 'Replace sync blocking operations with async counterparts.';
  }

  return 'Review iteration patterns for potential optimizations.';
}

export function scorePerformanceFindings(findings = []) {
  if (findings.length === 0) return 100;

  const highCount = findings.filter((finding) => finding.severity === 'high').length;
  const mediumCount = findings.filter((finding) => finding.severity === 'medium').length;
  return Math.max(0, 100 - (highCount * 15) - (mediumCount * 5));
}

export default {
  buildPerformanceMessage,
  buildPerformanceRecommendation,
  calculatePerformanceRisk,
  getPerformanceAtoms,
  scorePerformanceFindings
};
