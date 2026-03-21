function normalizeCount(value) {
  const count = Number(value || 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function normalizeText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function resolveSurfaceReason(surface = {}, fallbackReason = 'Surface summary was not supplied.') {
  const summary = surface?.summary;

  if (typeof summary === 'string') {
    return normalizeText(summary, fallbackReason);
  }

  if (summary && typeof summary === 'object') {
    return normalizeText(
      summary.nextAction ||
      summary.primaryIssue?.reason ||
      summary.primaryIssue?.message ||
      summary.recommendation ||
      summary.reason ||
      summary.message ||
      surface?.primaryIssue?.reason ||
      surface?.primaryIssue?.message ||
      surface?.recommendation ||
      fallbackReason,
      fallbackReason
    );
  }

  return normalizeText(
    surface?.primaryIssue?.reason ||
    surface?.primaryIssue?.message ||
    surface?.recommendation ||
    surface?.issues?.[0]?.message ||
    surface?.issues?.[0] ||
    surface?.warnings?.[0]?.message ||
    fallbackReason,
    fallbackReason
  );
}

function hasNonEmptyList(surface, key) {
  return Array.isArray(surface?.[key]) && surface[key].length > 0;
}

function hasAnyCoreCoverage(surface) {
  return (
    normalizeCount(surface?.filesTotal) > 0 ||
    normalizeCount(surface?.systemFilesTotal) > 0 ||
    normalizeCount(surface?.fileDependenciesTotal) > 0
  );
}

function hasCoreCoverageGaps(surface) {
  return (
    normalizeCount(surface?.fileDependenciesTotal) === 0 ||
    normalizeCount(surface?.systemFilesTotal) === 0 ||
    normalizeCount(surface?.activeFiles) === 0 ||
    normalizeCount(surface?.primaryFilesWithImports) === 0
  );
}

function scoreSurfaceState(surface = {}) {
  if (!surface || typeof surface !== 'object') {
    return 'missing';
  }

  if (surface.healthy === true) {
    return 'fresh';
  }

  if (hasNonEmptyList(surface, 'criticalFindings')) {
    return 'blocked';
  }

  if (surface.materiallyDrifting === true) {
    return 'stale';
  }

  if (!hasAnyCoreCoverage(surface)) {
    return 'missing';
  }

  if (hasNonEmptyList(surface, 'issues')) {
    return 'stale';
  }

  if (hasCoreCoverageGaps(surface)) {
    return 'missing';
  }

  if (hasNonEmptyList(surface, 'warnings')) {
    return 'partial';
  }

  return 'partial';
}

function buildSurfaceEntry({
  key,
  label,
  sourceOfTruth,
  surface,
  fallbackReason = 'Surface summary was not supplied.'
}) {
  const state = scoreSurfaceState(surface);
  const healthy = state === 'fresh';
  const trustworthy = state === 'fresh' || state === 'partial';
  const reason = resolveSurfaceReason(surface, fallbackReason);

  return {
    key,
    label,
    sourceOfTruth,
    state,
    healthy,
    trustworthy,
    reason,
    evidence: surface || {},
    counts: {
      filesTotal: normalizeCount(surface?.filesTotal),
      activeFiles: normalizeCount(surface?.activeFiles),
      primaryFilesWithImports: normalizeCount(surface?.primaryFilesWithImports),
      liveAtomFiles: normalizeCount(surface?.liveAtomFiles),
      systemFilesTotal: normalizeCount(surface?.systemFilesTotal),
      systemFilesWithImports: normalizeCount(surface?.systemFilesWithImports),
      fileDependenciesTotal: normalizeCount(surface?.fileDependenciesTotal),
      dependencySourceFiles: normalizeCount(surface?.dependencySourceFiles),
      activeAtoms: normalizeCount(surface?.metrics?.activeAtoms),
      activeCallRelations: normalizeCount(surface?.metrics?.activeCallRelations),
      activeSemanticConnections: normalizeCount(surface?.metrics?.activeSemanticConnections)
    }
  };
}

function summarizeSurfaceEntries(entries = []) {
  const summary = {
    total: entries.length,
    fresh: 0,
    partial: 0,
    stale: 0,
    missing: 0,
    blocked: 0,
    trustworthy: true
  };

  for (const entry of entries) {
    summary[entry.state] = (summary[entry.state] || 0) + 1;
    if (entry.state !== 'fresh' && entry.state !== 'partial') {
      summary.trustworthy = false;
    }
  }

  summary.nextAction = summary.trustworthy
    ? 'All tracked surfaces are fresh enough to trust downstream reads.'
    : 'Reconcile the stale or missing surfaces before trusting downstream consumers.';

  return summary;
}

function normalizePersistedFileCoverageSurface(surface = null) {
  if (!surface || typeof surface !== 'object') {
    return null;
  }

  const scannedFileTotal = normalizeCount(surface?.scannedFileTotal || surface?.totalFiles || surface?.filesTotal);
  const manifestFileTotal = normalizeCount(surface?.manifestFileTotal || surface?.liveIndexedFiles || surface?.activeFiles);

  return {
    ...surface,
    healthy: surface?.healthy !== false && surface?.synchronized !== false,
    filesTotal: scannedFileTotal,
    activeFiles: scannedFileTotal,
    primaryFilesWithImports: manifestFileTotal,
    systemFilesTotal: manifestFileTotal,
    fileDependenciesTotal: manifestFileTotal
  };
}

function normalizeFileImportEvidenceSurface(surface = null) {
  if (!surface || typeof surface !== 'object') {
    return null;
  }

  const filesTotal = normalizeCount(surface?.filesTotal || surface?.totalFiles || surface?.activeFiles);
  const importedFilesTotal = normalizeCount(surface?.primaryFilesWithImports || surface?.filesWithImports || surface?.importedFilesTotal);

  return {
    ...surface,
    healthy: surface?.healthy !== false,
    filesTotal,
    activeFiles: normalizeCount(surface?.activeFiles || surface?.filesTotal || surface?.totalFiles),
    primaryFilesWithImports: importedFilesTotal,
    systemFilesTotal: normalizeCount(surface?.systemFilesTotal || filesTotal),
    fileDependenciesTotal: normalizeCount(surface?.fileDependenciesTotal || filesTotal)
  };
}

export {
  normalizeCount,
  normalizeText,
  resolveSurfaceReason,
  hasNonEmptyList,
  hasAnyCoreCoverage,
  hasCoreCoverageGaps,
  scoreSurfaceState,
  buildSurfaceEntry,
  summarizeSurfaceEntries,
  normalizePersistedFileCoverageSurface,
  normalizeFileImportEvidenceSurface
};
