/**
 * @fileoverview Watcher-noise runtime/compiler metrics helpers.
 *
 * @module shared/compiler/compiler-runtime-metrics-watcher
 */

export function collectWatcherNoiseMetrics(stats = {}) {
  const startupNoiseSuppressed = stats?.startupNoiseSuppressed || 0;
  const startupSuppressionWindowMs = stats?.startupSuppressionWindowMs || 0;

  return {
    startupNoiseSuppressed,
    startupSuppressionWindowMs,
    summary: startupNoiseSuppressed > 0
      ? `${startupNoiseSuppressed} startup watcher event(s) suppressed`
      : 'No startup watcher noise suppressed'
  };
}
