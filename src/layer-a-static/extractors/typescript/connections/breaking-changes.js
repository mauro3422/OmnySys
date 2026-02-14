/**
 * connections/breaking-changes.js
 * Detect potential breaking changes in exported types
 */

/**
 * Detect potential breaking changes in types
 * @param {Object} fileResults - Map of filePath -> TS analysis
 * @returns {Array} - Breaking change alerts
 */
export function detectPotentialBreakingChanges(fileResults) {
  const alerts = [];

  // Find exported interfaces/types (public API)
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    for (const exp of analysis.exports || []) {
      alerts.push({
        type: 'PUBLIC_API',
        file: filePath,
        name: exp.name,
        kind: exp.type === 'interface_export' ? 'interface' : 'type',
        severity: 'INFO',
        reason: `Exported ${exp.type === 'interface_export' ? 'interface' : 'type'} '${exp.name}' is public API`,
        suggestion: 'Changes to this may break consumers'
      });
    }
  }

  return alerts;
}
