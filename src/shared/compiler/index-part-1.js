/**
 * @fileoverview Canonical entrypoints for compiler-wide signals and heuristics.
 *
 * Import compiler policy/dead-code helpers from this barrel so watcher, MCP
 * tools and metrics stop depending on private helper paths directly.
 *
 * @module shared/compiler
 */

export {
  normalizeSeverity,
  severityToLevel,
  scoreToSeverity,
  stripPrefix,
  safeArray,
  safeParseJson,
  hasPersistedStructuredValue,
  parsePersistedField,
  parsePersistedArray
} from './core-utils.js';

// Policy Drift Repair Engine
export {
  detectPolicyDrifts,
  detectPolicyDriftsBatch,
  generateRepairPlan,
  generateRepairPlansBatch,
  executeRepairPlan,
  consolidatePolicyDrifts
} from './policy-drift-repair-engine.js';

export {
  normalizeCount
} from './contract-helpers.js';

export {
  normalizeSnapshotPath,
  normalizeComparisonPath
} from './snapshot-path.js';

export {
  LANGUAGE_ADAPTER_CONTRACT,
  createLanguageAdapterContract,
  assertLanguageAdapterContract
} from './language-contract.js';

export {
  COMPILER_POLICY_SEVERITY,
  COMPILER_POLICY_AREA,
  detectCompilerPolicyDriftFromSource,
  scanCompilerPolicyDrift,
  summarizeCompilerPolicyDrift,
  buildCompilerPolicyIssueSummary
} from './policy-conformance/index.js';

export {
  isLowSignalDataFlowAlert,
  shouldSuppressWatcherAlert,
  getWatcherAlertBreakageSummary,
  isBreakingWatcherAlert,
  compareWatcherAlertPriority,
  classifyCompilerDiagnosticSignal,
  summarizeCompilerDiagnostics
} from './compiler-diagnostics.js';

export {
  normalizeRemediationSection,
  buildCompilerRemediationBacklog,
  buildPipelineHealthCompilerRemediationItems
} from './remediation-orchestration.js';

export {
  buildCompilerStandardizationReport
} from './standardization-report/index.js';

export {
  buildCompilerContractLayer
} from './compiler-contract-layer/layer.js';

export {
  loadCompilerDiagnosticsSnapshot
} from './snapshot.js';

export {
  classifyAtomOperationalRole,
  classifyFileOperationalRole
} from './atom-role-classification.js';

export {
  classifySignalConfidence,
  summarizeSignalConfidence
} from './signal-confidence.js';

export {
  buildDerivedFeatureRegistry,
  summarizeDerivedFeatureRegistry,
  findDerivedFeatureDefinition
} from './registry.js';

export {
  buildAnalysisGenerationSnapshot,
  compareAnalysisGenerations,
  summarizeAnalysisGeneration
} from './counts-generation.js';

export {
  buildCompilerMetricsSnapshot,
  summarizeCompilerMetricsSnapshot
} from './snapshot.js';

export {
  buildMcpTopologyTelemetry,
  persistMcpTopologyTelemetry,
  buildMcpTopologySummary
} from './mcp-topology-telemetry.js';

export {
  resolveSessionSyncGraceMs
} from './compiler-runtime-metrics-sessions-client-sync.js';

export {
  buildMcpRequestDeliveryTelemetry,
  persistMcpRequestDeliveryTelemetry,
  buildMcpRequestDeliverySummary
} from './mcp-request-delivery-telemetry.js';

export {
  buildCompilerMetricsSnapshotSummary
} from './metrics/snapshot-summary-text.js';

export {
  buildCompilerStatusSummaryEnvelope
} from './status-summary/summary.js';

export {
  buildStatusSummaryPayload
} from './status-summary/payload.js';

export {
  buildSystemTableSummary
} from './status-system-table.js';

export {
  getStatusResponseCacheEntry,
  setStatusResponseCacheEntry,
  clearStatusResponseCache
} from './status-response-cache.js';

export {
  compactDatabaseHealth,
  compactRepositoryDiagnostics,
  compactCompilerHealthDashboardSummary,
  compactCompilerHealthPanelSummary,
  compactWatcherSummary,
  compactToolInventory,
  summarizeNodeVitals,
  takeSample
} from './status-summary/index.js';

export {
  summarizeCompilerExplainability
} from './explainability/summary.js';

export {
  compactPolicySummary
} from './explainability/policy.js';

export {
  compactStandardization
} from './compiler-explainability-standardization.js';

export {
  compactCompilerContractLayer
} from './compiler-explainability-contract-layer.js';

export {
  buildCompilerMetricDictionary,
  summarizeCompilerMetricDictionary
} from './compiler-metric-dictionary.js';

export {
  buildCompilerToolInventoryReport
} from './tool-inventory-summary.js';

export {
  buildCompilerToolInventorySnapshot
} from './tool-inventory-summary.js';

export {
  buildCompilerSystemInventoryReport,
  buildCompilerSystemInventorySnapshot,
  summarizeCompilerSystemInventory
} from './system-inventory/summary.js';

export {
  buildCompilerPolicyCoverageSummary
} from './policy-coverage-summary.js';

export {
  loadConsolidationClusterContext
} from './conceptual-cluster-service.js';

export {
  loadAtomVersionArchiveHistory
} from './atom-history-archive.js';

export {
  buildCanonicalPromotionSnapshot,
  buildCanonicalPromotionReport,
  summarizeCanonicalPromotion
} from './canonical-promotion-summary.js';
