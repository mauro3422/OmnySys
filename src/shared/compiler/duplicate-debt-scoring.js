function buildFindingIdentity(finding = {}) {
  return `${finding.symbol}:${finding.duplicateType || 'UNKNOWN'}`;
}

function calculateDebtScore(newFindings, persistentFindings, resolvedFindings) {
  const persistentWeight = 3;
  const newWeight = 2;
  const resolvedWeight = -1;

  const rawScore = (
    (persistentFindings.length * persistentWeight) +
    (newFindings.length * newWeight) +
    (resolvedFindings.length * resolvedWeight)
  );

  const maxScore = 10 * persistentWeight;
  const normalizedScore = Math.min(100, Math.max(0, (rawScore / maxScore) * 100));
  return Math.round(normalizedScore);
}

function calculateTrend(newCount, resolvedCount, persistentCount) {
  if (persistentCount > 5) return 'critical-increasing';
  if (newCount > resolvedCount) return 'increasing';
  if (newCount < resolvedCount) return 'decreasing';
  if (persistentCount > 0) return 'stable-high';
  return 'stable';
}

export {
  buildFindingIdentity,
  calculateDebtScore,
  calculateTrend
};
