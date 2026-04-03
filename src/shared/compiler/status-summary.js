/**
 * Canonical compiler status summary envelope.
 *
 * Pure assembly helper used by the MCP status layer to keep the payload
 * assembly out of private leaf modules.
 */

export function buildCompilerStatusSummaryEnvelope(status = {}, recentErrors = null, sections = {}) {
  return {
    initialized: status.initialized,
    initializing: status.initializing,
    project: status.project,
    hotReloadTest: status.hotReloadTest,
    timestamp: status.timestamp,
    telemetryMode: status.telemetryMode,
    summary: {
      total: recentErrors?.summary?.total || 0,
      warnings: recentErrors?.summary?.warnings || 0,
      errors: recentErrors?.summary?.errors || 0
    },
    recentErrors,
    ...sections
  };
}

export default {
  buildCompilerStatusSummaryEnvelope
};
