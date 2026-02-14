/**
 * @fileoverview issue-utils.js
 * 
 * Utility functions for issues.
 * 
 * @module analyses/tier3/utils/issue-utils
 */

export function groupByFile(issues) {
  const byFile = {};
  for (const issue of issues) {
    const file = issue.sourceFile || issue.file;
    if (!byFile[file]) {
      byFile[file] = [];
    }
    byFile[file].push(issue);
  }
  return byFile;
}

export function sortBySeverity(issues) {
  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
