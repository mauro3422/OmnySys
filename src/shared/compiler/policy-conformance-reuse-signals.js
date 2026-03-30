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
    normalizedPath.endsWith('/snapshot.js') ||
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

export {
  buildPolicyImportMap,
  looksLikeCanonicalDiagnosticsBypass,
  looksLikeManualRuntimeOwnership,
  looksLikeManualTopologyScan,
  looksLikeWatcherDiagnosticsDrift
};
