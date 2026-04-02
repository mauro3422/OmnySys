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

export {
  normalizeCount
} from './contract-helpers.js';

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
} from './policy-conformance.js';

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
} from './standardization-report.js';

export {
  buildCompilerContractLayer
} from './compiler-contract-layer.js';

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
} from './compiler-metrics-snapshot.js';

export {
  buildCompilerLayerReliability,
  buildCompilerMetricDictionary,
  summarizeCompilerMetricDictionary
} from './compiler-metric-dictionary.js';

export {
  buildCompilerHealthDashboard,
  summarizeCompilerHealthDashboard,
  buildCompilerHealthPanel,
  summarizeCompilerHealthPanel
} from './compiler-health-dashboard.js';

export {
  evaluatePipelineTimingTelemetry,
  persistPipelineTimingTelemetry,
  buildPipelineTimingTelemetrySummary,
  summarizePipelineTimingTelemetry
} from './pipeline-timing-telemetry.js';

export {
  evaluateToolRunTelemetry,
  persistToolRunTelemetry,
  buildToolRunTelemetrySummary,
  summarizeToolRunTelemetry
} from './tool-run-telemetry.js';

export {
  buildSurfaceAudit,
  summarizeSurfaceAudit,
  summarizeSurfaceAuditForStatus
} from './surface-audit/audit.js';

export {
  buildCompilerDriftAssessment,
  summarizeCompilerDriftAssessment
} from './compiler-drift-assessment.js';

export {
  getMetadataExtractionCoverage,
  summarizeMetadataExtractionCoverage
} from './metadata-extraction-coverage/coverage.js';

export {
  buildSurfaceFreshnessLedger,
  summarizeSurfaceFreshnessLedger,
  buildDataGatewayContract,
  summarizeDataGatewayContract
} from './contract.js';

export {
  buildTelemetryProvenance,
  buildRuntimeCodeFreshness
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
  detectDataGatewayConformanceFromSource
} from './data-gateway-conformance.js';

export {
  detectAsyncErrorConformanceFromSource
} from './async-error-conformance.js';

export {
  detectSharedStateHotspotConformanceFromSource
} from './shared-state-hotspot-conformance.js';


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
  detectSummaryConformanceFromSource
} from './summary-conformance.js';

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
  normalizeUnusedInputName,
  isLikelyParserNoiseUnusedInput,
  getActionableUnusedInputs,
  isLikelyToolWrapperAtom,
  isLikelyBoundaryContainerAtom,
  hasAsyncNamingMismatch
} from './integrity-analysis.js';

export {
  getFileImportEvidenceCoverage
} from './file-import-evidence.js';

export {
  getSystemMapPersistenceCoverage,
  repairSystemMapPersistenceCoverage,
  shouldTrustSystemMapDependencies
} from './system-map-persistence.js';

export {
  repairMetadataExtractionCoverage
} from './metadata-extraction-coverage-repair.js';

export {
  getMetadataSurfaceParity
} from './metadata-surface-parity.js';

export {
  getSemanticSurfaceGranularity,
  summarizeSemanticCanonicality
} from './semantic-surface-granularity.js';

export {
  loadAtomSemanticSurface,
  summarizeAtomSemanticSurface,
  deriveSemanticConnectionsFromAtomSurface
} from './semantic-surface-derivation.js';

export {
  getDatabaseHealthSummary
} from './summary.js';

export {
  getFileUniverseGranularity
} from './file-universe-granularity.js';

export {
  buildCanonicalReuseGuidance
} from './canonical-reuse-guidance.js';

export {
  deriveFlatFamilyRoot,
  findFolderizationCandidateForPaths,
  findFolderizationCandidates,
  findFolderizationCandidatesFromRows,
  findFolderizationCandidatesFromRepo,
  buildFolderizationCandidateReport,
  buildFolderizationMigrationPlanFromRows,
  buildFolderizationMigrationPlanFromRepo,
  buildFolderizationNamingReportFromRows,
  buildFolderizationNamingReportFromRepo,
  buildFolderizationReportFromRows,
  buildFolderizationReportFromRepo,
  buildEmptyFolderizationReport,
  loadFolderizationRows,
  normalizeFolderizationPath
} from './directory-structure-folderization.js';

export {
  buildFolderizedFamilyGroups,
  buildFolderizedFamilySuggestion,
  findBestFolderizedFamilyForPaths,
  buildFolderizationNamingPlanFromRows,
  buildFolderizationNamingPlanFromRepo
} from './directory-structure-folderization-naming.js';

export {
  normalizeDerivedRiskLevel
} from './risk-level.js';

export {
  clampScore
} from './score-utils.js';

export {
  resolveArchitecturalRecommendation
} from './architectural-recommendations.js';

export {
  detectGodObject,
  detectOrphanModule,
  detectArchitecturalPatterns,
  getPatternDescriptions
} from '../architecture-utils.js';

export {
  parseSemanticFingerprint,
  classifyConceptualNoise
} from './conceptual-noise-policy.js';

export {
  classifyContractSurface,
  evaluateContractCompatibility,
  summarizeContractTaxonomy
} from './contract-taxonomy/index.js';

export {
  COMPILER_TARGET_DIRS,
  discoverProjectSourceFiles,
  discoverCompilerFiles,
  isCompilerRuntimeFile
} from './file-discovery.js';

export {
  hasPersistedCompilerAnalysis,
  loadPersistedScannedFilePaths,
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
  validateCompilerImports,
  reindexCompilerFile
} from './mutation-settlement-bridge.js';

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
  normalizeDeadCodeAtom,
  getFlaggedDeadCodeCount,
  getSuspiciousDeadCodeCount,
  getDeadCodePlausibilitySummary,
  loadSuspiciousDeadCodeCandidates,
  buildDeadCodeRemediation,
  buildDeadCodeRemediationPlan
} from './dead-code-utils.js';

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
} from './live-row-utils.js';

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
} from './directory-structure-analyzer.js';

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
} from './architectural-debt-score.js';

export {
  buildDuplicateDebtHistory,
  buildDuplicateContext
} from './duplicate-debt.js';

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
} from './pipeline-orphans.js';


export {
  getPipelineOrphanCandidates,
  getPipelineOrphanSummary,
  buildPipelineOrphanRemediation,
  buildPipelineOrphanRemediationPlan
} from './pipeline-orphans.js';

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

export {
  ALERT_THRESHOLDS,
  calculateToolTrend,
  generateAutomaticAlerts,
  getDailyToolMetrics,
  formatToolHealthDashboard
} from './tool-health-trending.js';
