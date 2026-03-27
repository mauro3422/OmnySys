import { normalizeCount } from './surface-utils.js';
import { resolveSurfaceReason, scoreSurfaceState } from './data-gateway-contract-helpers-scoring.js';

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

export {
  buildSurfaceEntry,
  summarizeSurfaceEntries
};
