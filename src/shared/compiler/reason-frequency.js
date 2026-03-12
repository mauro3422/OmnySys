export function buildReasonFrequency(evaluations = []) {
  const counts = new Map();
  for (const evaluation of evaluations) {
    for (const reason of evaluation.reasons || []) {
      counts.set(reason, (counts.get(reason) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count }));
}
