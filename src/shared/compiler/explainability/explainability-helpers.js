import { takeSample } from '../sample-helpers.js';

export function compactCountPair(summary = null) {
  if (!summary) return null;
  return {
    total: summary.total,
    healthy: summary.healthy
  };
}

export function compactAnalysisGeneration(analysisGeneration = null) {
  if (!analysisGeneration) return null;
  return {
    generationId: analysisGeneration.generationId,
    status: analysisGeneration.status,
    healthy: analysisGeneration.healthy,
    recommendation: analysisGeneration.recommendation
  };
}

export function compactExplainabilityWatcherSummary(watcher = null) {
  if (!watcher) return null;
  return {
    total: watcher.total,
    active: watcher.active,
    stale: watcher.stale,
    expired: watcher.expired
  };
}
