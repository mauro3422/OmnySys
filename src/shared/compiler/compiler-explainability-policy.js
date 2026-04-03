export function compactPolicySummary(policySummary = null) {
  if (!policySummary) return null;
  return {
    total: policySummary.total,
    high: policySummary.high,
    medium: policySummary.medium,
    low: policySummary.low
  };
}
