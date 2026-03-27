import { normalizeCount, normalizeText } from './surface-utils.js';

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

export {
  resolveSurfaceReason,
  hasNonEmptyList,
  hasAnyCoreCoverage,
  hasCoreCoverageGaps,
  scoreSurfaceState
};
