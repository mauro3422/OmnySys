/**
 * Shared helpers for architectural debt scoring.
 *
 * Keeping constants and ordering helpers outside the main scorer keeps the
 * scorer file under the file-size threshold while preserving the public API.
 */

export const CATEGORY_WEIGHTS = {
  directoryStructure: 0.25,
  patterns: 0.25,
  coupling: 0.25,
  duplication: 0.25
};

export const SEVERITY_THRESHOLDS = {
  low: { min: 0, max: 25 },
  moderate: { min: 26, max: 50 },
  high: { min: 51, max: 75 },
  critical: { min: 76, max: 100 }
};

export function getSeverityLevel(score) {
  if (score <= SEVERITY_THRESHOLDS.low.max) return 'low';
  if (score <= SEVERITY_THRESHOLDS.moderate.max) return 'moderate';
  if (score <= SEVERITY_THRESHOLDS.high.max) return 'high';
  return 'critical';
}

export function sortIssuesBySeverityAndLocation(allIssues) {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const getIssueLocation = (issue) => issue?.file || issue?.filePath || issue?.name || issue?.symbol || '';
  const getSeverityRank = (severity) => severityOrder[severity] ?? 99;

  return allIssues.sort((a, b) => {
    const severityDiff = getSeverityRank(a.severity) - getSeverityRank(b.severity);
    if (severityDiff !== 0) return severityDiff;
    return getIssueLocation(a).localeCompare(getIssueLocation(b));
  });
}
