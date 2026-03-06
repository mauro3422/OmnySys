/**
 * @fileoverview Canonical entrypoints for compiler-wide signals and heuristics.
 *
 * Import compiler policy/dead-code helpers from this barrel so watcher, MCP
 * tools and metrics stop depending on private helper paths directly.
 *
 * @module shared/compiler
 */

export {
  COMPILER_POLICY_SEVERITY,
  COMPILER_POLICY_AREA,
  detectCompilerPolicyDriftFromSource,
  scanCompilerPolicyDrift,
  summarizeCompilerPolicyDrift,
  buildCompilerPolicyIssueSummary
} from './policy-conformance.js';

export {
  classifyCompilerDiagnosticSignal,
  summarizeCompilerDiagnostics
} from './compiler-diagnostics.js';

export {
  normalizeRemediationSection,
  buildCompilerRemediationBacklog
} from './remediation-orchestration.js';

export {
  buildCompilerStandardizationReport
} from './standardization-report.js';

export {
  detectStateOwnershipConformanceFromSource
} from './state-ownership-conformance.js';

export {
  detectServiceBoundaryConformanceFromSource
} from './service-boundary-conformance.js';

export {
  detectCanonicalExtensionConformanceFromSource
} from './canonical-extension-conformance.js';

export {
  getCompilerRuntimeDir,
  getDaemonOwnerLockPath,
  ensureCompilerRuntimeDirSync,
  writeDaemonOwnerLockSync,
  removeDaemonOwnerLockSync,
  isCompilerProcessAlive,
  readDaemonOwnerLock,
  waitForDaemonOwner
} from './runtime-ownership.js';

export {
  buildCompilerReadinessStatus,
  buildRestartLifecycleGuidance
} from './session-restart-lifecycle.js';

export {
  getDeadCodeSqlPredicate,
  isSuspiciousDeadCodeAtom,
  normalizeDeadCodeAtom
} from './dead-code-heuristics.js';

export {
  getFlaggedDeadCodeCount,
  getSuspiciousDeadCodeCount,
  getDeadCodePlausibilitySummary
} from './dead-code-reporting.js';

export {
  loadSuspiciousDeadCodeCandidates,
  buildDeadCodeRemediation,
  buildDeadCodeRemediationPlan
} from './dead-code-remediation.js';

export {
  DERIVED_SCORE_SIGNALS,
  PIPELINE_FIELD_COVERAGE_SIGNALS,
  summarizeDerivedScoreCoverage,
  summarizeSemanticCoverage,
  summarizePhysicsCoverageRow,
  classifyFieldCoverage
} from './signal-coverage.js';

export {
  getLiveFileSetSql,
  getLiveFileTotal,
  getStaleTableRowCount,
  getLiveRowDriftSummary
} from './live-row-drift.js';

export {
  loadStaleTableRows,
  buildLiveRowReconciliationPlan
} from './live-row-reconciliation.js';

export {
  buildLiveRowRemediationPlan
} from './live-row-remediation.js';

export {
  buildLiveRowCleanupPlan,
  executeLiveRowCleanup
} from './live-row-cleanup.js';

export {
  buildDuplicateRemediation,
  buildDuplicateRemediationPlan
} from './duplicate-remediation.js';

export {
  PIPELINE_ORPHAN_NAME_PATTERNS,
  getEffectiveCallerCount,
  isPipelineProductionFile,
  hasFileLevelImportEvidence,
  isLikelyDisconnectedPipelineAtom,
  getPipelineNamePatternSqlCondition,
  normalizePipelineOrphan,
  classifyPipelineOrphans
} from './pipeline-orphans.js';

export {
  getPipelineOrphanCandidates,
  getPipelineOrphanSummary
} from './pipeline-orphan-reporting.js';

export {
  buildPipelineOrphanRemediation,
  buildPipelineOrphanRemediationPlan
} from './pipeline-orphan-remediation.js';

export {
  WATCHER_MESSAGE_PREFIX,
  WATCHER_ALERT_SOURCE,
  WATCHER_CONTRACT_VERSION,
  isWatcherIssueMessage,
  stripWatcherMessagePrefix,
  normalizeWatcherIssueContext,
  serializeWatcherIssueContext,
  parseWatcherIssueContext,
  createWatcherIssueRecord,
  mapSemanticIssueRowToWatcherAlert,
  summarizeWatcherAlerts
} from './watcher-issues.js';

export {
  WATCHER_ALERT_LIFECYCLE,
  WATCHER_ALERT_TTL_MS,
  getWatcherAlertTtlMs,
  classifyWatcherAlertLifecycle,
  attachWatcherAlertLifecycle,
  summarizeWatcherAlertLifecycle
} from './watcher-issue-lifecycle.js';

export {
  WATCHER_LIFECYCLE_FILTER,
  normalizeWatcherAlertLifecycleFilter,
  matchesWatcherAlertLifecycle,
  partitionWatcherAlertsByLifecycle,
  filterWatcherAlertsByLifecycle
} from './watcher-issue-reconciliation.js';
