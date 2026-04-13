// Thin barrel — re-exports everything from the folderized family
export {
  resolveSessionSyncGraceMs,
  isRecentSessionActivityObserved,
  resolveSessionCountDrift,
  normalizeTransportOriginCounts,
  normalizeTransportCountMap,
  buildTransportAlert,
  summarizeTransportAlertState,
  deriveTransportAlerts,
  buildMcpSessionTransportProvenance,
  buildMcpSessionMetricsResult,
  resolveMcpSessionMetricsBaseline,
  buildEmptyMcpSessionMetrics,
  buildClientSyncDiagnostics,
  collectSessionDbSnapshot
} from './sessions-state/index.js';
