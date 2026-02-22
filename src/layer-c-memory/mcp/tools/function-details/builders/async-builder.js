/**
 * @fileoverview Async Analysis Builder - Construye sección de análisis async
 */

/**
 * Construye la sección de análisis async
 * @param {Object} atom - Átomo con metadata temporal
 * @returns {Object|null} - Sección de análisis async o null
 */
export function buildAsyncAnalysis(atom) {
  if (!atom.temporal?.patterns) return null;

  const temporal = atom.temporal.patterns;
  const asyncFlow = temporal.asyncFlowAnalysis;

  return {
    patterns: {
      isAsync: temporal.asyncPatterns?.isAsync || atom.isAsync,
      hasAwait: temporal.asyncPatterns?.hasAwait,
      hasPromiseAll: temporal.asyncPatterns?.hasPromiseAll,
      hasPromiseRace: temporal.asyncPatterns?.hasPromiseRace,
      hasPromiseAllSettled: temporal.asyncPatterns?.hasPromiseAllSettled,
      hasNewPromise: temporal.asyncPatterns?.hasNewPromise,
      hasPromiseChain: temporal.asyncPatterns?.hasPromiseChain
    },
    sequentialOperations: temporal.asyncPatterns?.sequentialOperations || [],
    parallelOperations: temporal.asyncPatterns?.parallelOperations || [],
    flowAnalysis: asyncFlow ? {
      overallRisk: asyncFlow.overallRisk,
      summary: asyncFlow.summary,
      recommendations: asyncFlow.allRecommendations || [],
      concerns: asyncFlow.analyses?.flatMap(a => a.concerns || []) || []
    } : null,
    timers: temporal.timers || [],
    events: temporal.events || [],
    executionOrder: temporal.executionOrder || atom.temporal.executionOrder
  };
}
