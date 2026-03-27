import { getRecommendation } from './recommendations/RecommendationEngine.js';
import { createGuidedFinding } from './conformance-utils.js';

function maybeFinding(when, params) {
  return when ? [createGuidedFinding(params)] : [];
}

function looksLikeManualTopologyScan(source = '') {
  const manualGraphWalk =
    /(allAtoms|graphAtoms)\.(filter|map|reduce|find)\([\s\S]{0,600}?(calledBy|callerId|calls?|callees?|dependents?|affectedFiles|dependencyTree|brokenCallers|totalCallers)/.test(source) ||
    /new\s+Set\(\)\s*;[\s\S]{0,600}?(affectedFiles\.add|dependents\.push|dependencyTree\.push)/.test(source) ||
    /(callerId|calledBy|calls?)\?.*(filter|map|some|find)\(/.test(source);

  const topologyReportingOnly =
    /(buildKeyMetrics|deriveSchema|computeCorrelations|fieldEvolution|schemaType\s*:\s*['"]atoms['"])/.test(source) &&
    !/(affectedFiles\.add|dependents\.push|dependencyTree\.push|brokenCallers|totalCallers)/.test(source);

  return manualGraphWalk && !topologyReportingOnly;
}

function looksLikeManualRuntimeOwnership(source = '') {
  return /getDaemonOwnerLockPath|writeDaemonOwnerLockSync|removeDaemonOwnerLockSync|readDaemonOwnerLock|waitForDaemonOwner|isCompilerProcessAlive/.test(source);
}

function looksLikeCanonicalDiagnosticsBypass(normalizedPath, source = '') {
  if (!source) {
    return false;
  }

  if (
    normalizedPath.endsWith('/compiler-diagnostics-snapshot.js') ||
    normalizedPath.startsWith('src/shared/compiler/')
  ) {
    return false;
  }

  if (/loadCompilerDiagnosticsSnapshot/.test(source)) {
    return false;
  }

  const canonicalSignals = [
    /buildCompilerStandardizationReport/,
    /buildCompilerContractLayer/,
    /summarizePersistedScannedFileCoverage/,
    /syncPersistedScannedFileManifest/,
    /getFileImportEvidenceCoverage/,
    /getMetadataExtractionCoverage/,
    /getSystemMapPersistenceCoverage/,
    /getMetadataSurfaceParity/,
    /getSemanticSurfaceGranularity/,
    /summarizeSemanticCanonicality/,
    /getFileUniverseGranularity/
  ];

  return canonicalSignals.filter((pattern) => pattern.test(source)).length >= 3;
}

function looksLikeWatcherDiagnosticsDrift(normalizedPath, source = '') {
  if (!source || normalizedPath.startsWith('src/shared/compiler/')) {
    return false;
  }

  const touchesWatcherPersistence =
    /semantic_issues|persistWatcherIssue|clearWatcherIssue|reconcileWatcherIssues|findOutdatedWatcherAlertIds|findSupersededWatcherAlertIds/.test(source);
  const touchesCanonicalWatcherSurface =
    /mapSemanticIssueRowToWatcherAlert|attachWatcherAlertLifecycle|filterWatcherAlertsByLifecycle|partitionWatcherAlertsByLifecycle/.test(source);
  const touchesCanonicalAtomSurface =
    /FROM\s+atoms|SELECT[\s\S]{0,120}FROM\s+atoms|ensureLiveRowSync|loadCompilerDiagnosticsSnapshot/.test(source);

  return touchesWatcherPersistence && touchesCanonicalWatcherSurface && touchesCanonicalAtomSurface;
}

function buildPolicyImportMap(source = '') {
  return {
    importsGetAllAtoms: /getAllAtoms/.test(source),
    importsImpactApis: /getFileDependents|getTransitiveDependents|getFileImpactSummary|classifyImpactSeverity/.test(source),
    importsDuplicateApi: /getDuplicateKeySqlForMode|getDuplicateKeySql|getStructuralDuplicateKeySql|buildDuplicateWhereSql|normalizeDuplicateCandidateAtom|getValidDnaPredicate|DUPLICATE_MODES/.test(source),
    importsFileDiscoveryApi: /discoverCompilerFiles|discoverProjectSourceFiles|isCompilerRuntimeFile/.test(source),
    importsLiveRowDriftApi: /getLiveRowDriftSummary|getStaleTableRowCount|getLiveFileTotal|getLiveFileSetSql/.test(source),
    importsLiveRowSyncApi: /ensureLiveRowSync/.test(source),
    importsRuntimeOwnershipApi: /getDaemonOwnerLockPath|writeDaemonOwnerLockSync|removeDaemonOwnerLockSync|readDaemonOwnerLock|waitForDaemonOwner|isCompilerProcessAlive/.test(source)
  };
}

function collectManualReuseFindings(normalizedPath, source, imports) {
  return [
    ...maybeFinding(
      imports.importsGetAllAtoms &&
      /atom\.name\s*===\s*symbolName|instance\.name\s*===\s*symbolName/.test(source),
      {
        rule: 'manual_symbol_duplicate_scan',
        severity: 'medium',
        policyArea: 'duplicates',
        message: 'Manual symbol duplicate scan detected',
        recommendation: getRecommendation({
          type: 'policy_conformance',
          context: { message: 'Use repository-backed duplicate/symbol APIs instead of scanning getAllAtoms() in memory.' }
        }).message
      }
    ),
    ...maybeFinding(
      imports.importsGetAllAtoms && looksLikeManualTopologyScan(source) && !imports.importsImpactApis,
      {
        rule: 'manual_topology_scan',
        severity: 'high',
        policyArea: 'impact',
        message: 'Manual topology/impact scan detected',
        recommendation: getRecommendation({
          type: 'policy_conformance',
          context: { message: 'Use the canonical impact APIs (getFileImpactSummary / getFileDependents / getTransitiveDependents) instead of rebuilding impact from getAllAtoms().' }
        }).message
      }
    ),
    ...maybeFinding(
      /json_extract\([^)]*dna_json/.test(source) &&
      /duplicate_key|DuplicateGroups/.test(source) &&
      !imports.importsDuplicateApi &&
      !normalizedPath.endsWith('/duplicate-dna.js'),
      {
        rule: 'manual_duplicate_sql',
        severity: 'high',
        policyArea: 'duplicates',
        message: 'Manual duplicate DNA SQL detected',
        recommendation: getRecommendation({
          type: 'policy_conformance',
          context: { message: 'Build duplicate keys through duplicate-dna.js / repository utils barrel instead of embedding SQL fragments.' }
        }).message
      }
    ),
    ...maybeFinding(
      /fs\.readdir|fs\.readFile/.test(source) &&
      /collectFilesRecursively|readdirSync|walkDir|walkDirectory/.test(source) &&
      (normalizedPath.includes('/mcp/') || normalizedPath.includes('/shared/compiler/')) &&
      !imports.importsFileDiscoveryApi,
      {
        rule: 'manual_file_discovery_scan',
        severity: 'medium',
        policyArea: 'file_discovery',
        message: 'Manual file discovery scan detected inside MCP/compiler runtime',
        recommendation: getRecommendation({
          type: 'policy_conformance',
          context: { message: 'Prefer canonical query/storage APIs before walking the filesystem manually inside MCP/runtime code.' }
        }).message
      }
    ),
    ...maybeFinding(
      imports.importsLiveRowDriftApi &&
      !imports.importsLiveRowSyncApi &&
      (normalizedPath.includes('/mcp/') || normalizedPath.includes('/query/')) &&
      !normalizedPath.endsWith('/live-row-utils.js'),
      {
        rule: 'live_row_sync_missing',
        severity: 'medium',
        policyArea: 'live_row_drift',
        message: 'Module reads live/stale row drift without the canonical synchronization entrypoint',
        recommendation: getRecommendation({ type: 'live_row_drift' }).message
      }
    ),
    ...maybeFinding(
      looksLikeManualRuntimeOwnership(source) &&
      !imports.importsRuntimeOwnershipApi &&
      !normalizedPath.endsWith('/runtime-ownership.js'),
      {
        rule: 'manual_runtime_ownership',
        severity: 'medium',
        policyArea: 'runtime_ownership',
        message: 'Manual daemon ownership/lock logic detected',
        recommendation: getRecommendation({
          type: 'policy_conformance',
          context: { message: 'Use runtime-ownership.js from shared/compiler instead of reimplementing daemon owner lock handling inline.' }
        }).message
      }
    ),
    ...maybeFinding(
      looksLikeWatcherDiagnosticsDrift(normalizedPath, source),
      {
        rule: 'manual_watcher_diagnostics_reconciliation',
        severity: 'medium',
        policyArea: 'watcher_diagnostics',
        message: 'Module mixes watcher persistence, lifecycle and canonical atom/diagnostics reads without a dedicated canonical watcher reconciliation API',
        recommendation: getRecommendation({
          type: 'policy_conformance',
          context: { message: 'Route watcher reconciliation through shared/compiler watcher diagnostics helpers instead of composing semantic_issues, lifecycle and atoms heuristics inline.' }
        }).message
      }
    ),
    ...maybeFinding(
      looksLikeCanonicalDiagnosticsBypass(normalizedPath, source),
      {
        rule: 'canonical_diagnostics_bypass',
        severity: 'high',
        policyArea: 'canonical_bypass',
        message: 'Module recomposes canonical compiler diagnostics instead of using the shared snapshot entrypoint',
        recommendation: getRecommendation({
          type: 'policy_conformance',
          context: { message: 'Use loadCompilerDiagnosticsSnapshot from shared/compiler/index.js before creating another local diagnostics wrapper.' }
        }).message
      }
    )
  ];
}

export {
  buildPolicyImportMap,
  collectManualReuseFindings
};
