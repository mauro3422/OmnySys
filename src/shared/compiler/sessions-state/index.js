/**
 * @fileoverview Barrel for MCP session state and metrics.
 *
 * Split from the original 644-line monolith into focused modules:
 * - `utils.js`: Leaf functions (normalization, alert building, sync grace)
 * - `transport-alerts.js`: Alert derivation from transport telemetry
 * - `transport-provenance.js`: Provenance analysis and state scoring
 * - `session-metrics.js`: Session metrics result, baseline resolution, empty builder
 *
 * @module shared/compiler/sessions-state
 */

export {
  resolveSessionSyncGraceMs,
  isRecentSessionActivityObserved,
  resolveSessionCountDrift,
  normalizeTransportOriginCounts,
  normalizeTransportCountMap,
  buildTransportAlert,
  summarizeTransportAlertState
} from './utils.js';

export {
  deriveTransportAlerts
} from './transport-alerts.js';

export {
  buildMcpSessionTransportProvenance
} from './transport-provenance.js';

export {
  buildMcpSessionMetricsResult,
  resolveMcpSessionMetricsBaseline,
  buildEmptyMcpSessionMetrics
} from './session-metrics.js';

// Re-exports from external modules (kept for backward compatibility)
export { buildClientSyncDiagnostics } from './compiler-runtime-metrics-sessions-client-sync.js';
export { collectSessionDbSnapshot } from '#layer-c/query/apis/mcp-sessions-api.js';
