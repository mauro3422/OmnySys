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
} from './status-summary.js';

export {
  buildStatusSummaryPayload
} from './status-summary-payload.js';

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
} from './status-summary-helpers.js';

export {
  summarizeCompilerExplainability
} from './compiler-explainability-summary.js';

export {
  compactPolicySummary
} from './compiler-explainability-policy.js';

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
} from './system-inventory-summary.js';

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

export {
  buildTrustInvestigationReport,
  summarizeTrustInvestigationReport
} from './trust-investigation-report.js';

export {
  buildTrustRemediationBatchPlan,
  summarizeTrustRemediationBatchPlan
} from './trust-remediation-batches.js';

export {
  buildCompilerLayerReliability
} from './compiler-metric-reliability.js';

export {
  buildMetricAlignmentSignal,
  summarizeMetricAlignment
} from './metric-alignment-summary.js';

export {
  buildPropagationLedger,
  summarizePropagationLedger
} from './propagation-ledger.js';

export {
  buildCachePolicySummary
} from './cache-policy-summary.js';

export {
  buildCompilerHealthDashboard,
  summarizeCompilerHealthDashboard,
  buildCompilerHealthPanel,
  summarizeCompilerHealthPanel
} from './dashboard.js';

export {
  buildCompilerObservabilityContract,
  summarizeCompilerObservabilityContract
} from './compiler-observability-contract.js';

export {
  buildCompilerControlPlane,
  summarizeCompilerControlPlane
} from './compiler-control-plane.js';

export {
  buildUpdateSurfaceSummary
} from './update-surface-summary.js';

export {
  summarizeMcpParseContext
} from './mcp-parse-context.js';

export {
  getProxyRuntimeTelemetryPath,
  readProxyRuntimeTelemetry,
  writeProxyRuntimeTelemetrySync,
  summarizeProxyRuntimeTelemetry
} from './proxy-runtime-telemetry.js';

export {
  getBridgeRuntimeTelemetryPath,
  readBridgeRuntimeTelemetry,
  writeBridgeRuntimeTelemetrySync,
  summarizeBridgeRuntimeTelemetry,
  summarizeBridgeCallReliability
} from './bridge-runtime-telemetry.js';

export {
  analyzeTestCoverage,
  compareWithGeneratedTests
} from './test-coverage-analyzer.js';

export {
  loadCompilerExplainability
} from './compiler-explainability-loader.js';

export {
  evaluatePipelineTimingTelemetry,
  persistPipelineTimingTelemetry,
  buildPipelineTimingTelemetrySummary,
  summarizePipelineTimingTelemetry
} from './pipeline-timing-telemetry.js';

export {
  evaluateToolRunTelemetry,
  persistToolRunTelemetry,
  summarizeToolRunTelemetry
} from './tool-run-telemetry/telemetry.js';

export {
  buildToolRunTelemetrySummary
} from './tool-run-telemetry/summary.js';

export {
  buildCompilerHistoricalStorageSummary
} from './compiler-persistence-paths.js';

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
  validateMetricCoherence,
  validateDatabaseCoherence,
  validateReportingCoherence,
  validateDerivedMetricsCoherence,
  validateSnapshotSummaryCoherence
} from './metric-coherence-validator.js';

export {
  runAsyncBoundary
} from './async-boundary.js';

export {
  getMetadataExtractionCoverage,
  summarizeMetadataExtractionCoverage
} from './metadata-extraction-coverage/coverage.js';

export {
  buildCompilerControlPlaneFoundations
} from './control-plane-foundations.js';

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
  RecoveryStrategies
} from './runtime-boundary-recovery.js';

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
  detectPropagationExpansionConformanceFromSource
} from './propagation-expansion-conformance.js';

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
} from './semantic-surface-derivation/derivation.js';

export {
  getDatabaseHealthSummary
} from './database-health-summary.js';

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
  buildFolderizationAutomationSummaryFromRows,
  buildFolderizationAutomationSummaryFromRepo,
  buildFolderizationReportFromRows,
  buildFolderizationReportFromRepo,
  buildEmptyFolderizationReport,
  loadFolderizationRows,
  normalizeFolderizationPath
} from './directory-structure-folderization.js';

export {
  buildImpactWavePropagationPlan,
  buildTopologyRegressionPropagationPlan,
  buildSemanticCoveragePropagationPlan,
  buildPolicyDriftPropagationPlan,
  buildPipelineHealthPropagationPlan,
  buildPipelineOrphanPropagationPlan,
  buildDuplicateRiskPropagationPlan,
  buildIntegrityGuardPropagationPlan,
  buildPropagationPlan,
  summarizePropagationPlan
} from './propagation-engine.js';

export {
  scanPropagationCompleteness,
  buildPropagationCompletenessSignal
} from './propagation-completeness-scanner.js';

export {
  buildFolderizedFamilyGroups,
  buildFolderizedFamilySuggestion,
  findBestFolderizedFamilyForPaths,
  buildFolderizationNamingPlanFromRows,
  buildFolderizationNamingPlanFromRepo
} from './directory-structure-folderization-naming/index.js';

export {
  buildFolderizationNormalizationPlanFromRows,
  buildFolderizationNormalizationPlanFromRepo
} from './folderization-normalizer.js';

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
} from './persistence/index.js';

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
  buildStartupRegressionSummary
} from './startup-regression-summary.js';

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
