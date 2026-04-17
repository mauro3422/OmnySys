export {
  DERIVED_SCORE_SIGNALS,
  PIPELINE_FIELD_COVERAGE_SIGNALS,
  summarizeDerivedScoreCoverage,
  summarizeSemanticCoverage,
  summarizeFieldCoverageRow,
  summarizeCentralityCoverageRow,
  summarizePhysicsCoverageRow,
  classifyFieldCoverage,
  collectPipelineFieldCoverageFindings
} from './coverage.js';

export {
  getLiveFileSetSql,
  getLiveFileTotal,
  getStaleTableRowCount,
  getLiveRowDriftSummary,
  loadStaleTableRows
} from './live-row-utils/index.js';

export {
  buildLiveRowReconciliationPlan,
  buildLiveRowCleanupPlan,
  executeLiveRowCleanup,
  buildLiveRowRemediationPlan,
  ensureLiveRowSync
} from './live-row-reconciliation.js';

export {
  buildDuplicateRemediation,
  buildDuplicateRemediationPlan
} from './duplicate-remediation.js';

export {
  normalizeFilePath
} from './path-normalization.js';

export {
  groupAtomsByResponsibility,
  groupByClass,
  groupByExports,
  groupByDNA,
  groupByImports,
  buildGroupsFromArray,
  extractImports,
  buildSplitPlan,
  buildFileContent,
  buildBarrelContent,
  analyzeCoupling,
  generateSuggestions
} from './split-large-file-helpers.js';

export {
  generateAlternativeNames,
  isCanonicalDuplicateSignalPolicyFile,
  isLowSignalGeneratedAtom,
  isLowSignalConceptualFingerprint,
  isRepositoryContractSurface,
  isGuardUtilityConceptualFingerprint,
  isCanonicalMcpToolRouter,
  isRuntimePortProbeHelper,
  isMcpHttpProxyLifecycleHelper,
  isLegacyLlmBootstrapCompatibilityHelper,
  isStandaloneScriptEntryHelper,
  isLowSignalGuardStructuralHelper,
  shouldIgnoreConceptualDuplicateFinding,
  shouldIgnoreStructuralDuplicateFinding,
  classifyUtilityHelperDuplicate,
  loadPreviousFindings,
  coordinateDuplicateFindings
} from './duplicate-signal-policy.js';

export {
  findExistingHelpers,
  buildReuseSuggestion,
  detectHelperReuseOpportunities
} from './helper-reuse-detector.js';

export {
  analyzeDirectoryStructure,
  suggestDirectoryForFile,
  validateFileLocation,
  detectArchitecturalDrift,
  calculateArchitectureOrganizationScore
} from './directory-structure-analyzer/index.js';

export {
  detectArchitecturalPattern,
  detectHelperUtilityPattern,
  detectPolicyModulePattern,
  detectServiceLayerPattern,
  detectAllArchitecturalPatterns,
  summarizeArchitecturalPatterns,
  ARCHITECTURAL_PATTERNS
} from './architectural-pattern-detector/index.js';

export {
  calculateArchitecturalDebtScore,
  getSeverityLevel
} from './architectural-debt/index.js';

export {
  buildDuplicateDebtHistory,
  buildDuplicateContext
} from './duplicate-debt/index.js';

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
  getAtomCountSummary,
  getPhase2PendingFiles,
  getPhase2FileCounts,
  getGraphCoverageSummary,
  getIssueSummary,
  getConceptualDuplicateSummary,
  getFileUniverseSummary,
  getMcpSessionSummary,
  summarizeWatcherNoise
} from './compiler-runtime-metrics/index.js';

export {
  analyzeAtomSemantics,
  buildAssertionFromSemantics,
  getAnalyzerForFile,
  getAssertionForAtom,
  getAtomSemantics,
  JsAnalyzer
} from './atom-semantic-analyzer.js';

export {
  performAction
} from './actions/ActionEngine.js';

export {
  PIPELINE_ORPHAN_NAME_PATTERNS,
  getEffectiveCallerCount,
  isPipelineProductionFile,
  hasFileLevelImportEvidence,
  isLikelyDisconnectedPipelineAtom,
  getPipelineNamePatternSqlCondition,
  normalizePipelineOrphan,
  classifyPipelineOrphans
} from './pipeline-orphans/index.js';

export {
  getPipelineOrphanCandidates,
  getPipelineOrphanSummary,
  buildPipelineOrphanRemediation,
  buildPipelineOrphanRemediationPlan
} from './pipeline-orphans/index.js';

export {
  getPipelineFieldCoverageContext
} from './pipeline-health-context.js';

export {
  collectDiscoveredFilePaths,
  reconcilePersistedManifestCoverage,
  summarizePersistedManifestDrift
} from './analysis-change-reconciliation.js';

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
