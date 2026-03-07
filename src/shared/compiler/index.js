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
  isLowSignalDataFlowAlert,
  shouldSuppressWatcherAlert,
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
  classifyAtomOperationalRole,
  classifyFileOperationalRole
} from './atom-role-classification.js';

export {
  classifySignalConfidence,
  summarizeSignalConfidence
} from './signal-confidence.js';

export {
  buildTelemetryProvenance
} from './telemetry-provenance.js';

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
  detectAsyncErrorConformanceFromSource
} from './async-error-conformance.js';

export {
  detectSharedStateHotspotConformanceFromSource
} from './shared-state-hotspot-conformance.js';

export {
  detectCentralityCoverageConformanceFromSource
} from './centrality-coverage-conformance.js';

export {
  detectTestabilityConformanceFromSource
} from './testability-conformance.js';

export {
  detectSemanticPurityConformanceFromSource
} from './semantic-purity-conformance.js';

export {
  detectMetadataPropagationConformanceFromSource
} from './metadata-propagation-conformance.js';

export {
  evaluateAtomTestability,
  evaluateAtomSemanticPurity,
  evaluateAtomRefactoringSignals
} from './atom-evaluation.js';

export {
  summarizeAtomTestability
} from './testability-reporting.js';

export {
  summarizeAtomSemanticPurity
} from './semantic-purity-reporting.js';

export {
  summarizeSharedStateHotspots,
  getSharedStateContentionSummary
} from './shared-state-reporting.js';

export {
  getFileImportEvidenceCoverage
} from './file-import-evidence.js';

export {
  getSystemMapPersistenceCoverage,
  shouldTrustSystemMapDependencies
} from './system-map-persistence.js';

export {
  getMetadataSurfaceParity
} from './metadata-surface-parity.js';

export {
  getSemanticSurfaceGranularity
} from './semantic-surface-granularity.js';

export {
  getFileUniverseGranularity
} from './file-universe-granularity.js';

export {
  buildCanonicalReuseGuidance
} from './canonical-reuse-guidance.js';

export {
  COMPILER_TARGET_DIRS,
  discoverProjectSourceFiles,
  discoverCompilerFiles,
  isCompilerRuntimeFile
} from './file-discovery.js';

export {
  hasPersistedCompilerAnalysis,
  getPersistedIndexedFilePaths,
  getPersistedScannedFilePaths,
  getPersistedKnownFilePaths,
  syncPersistedScannedFileManifest,
  summarizePersistedScannedFileCoverage,
  findIndexedFileCandidate,
  cleanupOrphanedCompilerArtifacts,
  removePersistedFileMetadata,
  removePersistedAtomMetadata,
  emitOrphanedImportsFromPersistedMetadata
} from './compiler-persistence.js';

export {
  isRuntimeLifecycleFile,
  isSameFileCycle,
  isIntentionalAlgorithmicCycle,
  isEventDrivenLifecycleCycle,
  classifyCircularCycle
} from './circular-conformance.js';

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
  summarizeFieldCoverageRow,
  summarizeCentralityCoverageRow,
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
  ensureLiveRowSync
} from './live-row-sync.js';

export {
  buildDuplicateRemediation,
  buildDuplicateRemediationPlan
} from './duplicate-remediation.js';

export {
  generateAlternativeNames,
  normalizeFilePath,
  loadPreviousFindings,
  buildDuplicateDebtHistory,
  buildDuplicateContext,
  coordinateDuplicateFindings
} from './duplicate-utils.js';

export {
  getCachedMetadata,
  getCachedCounts,
  getLastAnalyzed,
  getPhase2Status,
  buildGuardMetadata,
  getMetadataFromMap,
  listMetadataItems
} from './metadata-utils.js';

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
  getWatcherIssueFamily,
  getWatcherIssueIdentity,
  findSupersededWatcherAlertIds,
  partitionWatcherAlertsByLifecycle,
  filterWatcherAlertsByLifecycle
} from './watcher-issue-reconciliation.js';

export {
  normalizeWatcherIssueFilePath,
  findOrphanedWatcherAlertIds,
  findOutdatedWatcherAlertIds
} from './watcher-issue-storage.js';
