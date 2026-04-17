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
  buildSemanticGranularityComparison,
  summarizeSemanticGranularity
} from './semantic-granularity-api.js';

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
} from './directory-structure-folderization/index.js';

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
  validateCompilerExports,
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
