/**
 * @fileoverview Async Info Extractor - Extrae información async de átomos
 */

/**
 * Extrae información de patrones async de un átomo
 * @param {Object} atom - Átomo a analizar
 * @returns {Object} - Información async extraída
 */
export function extractAsyncInfo(atom) {
  const temporal = atom.temporal?.patterns || atom.temporal || {};
  
  return {
    isAsync: atom.isAsync || temporal.asyncPatterns?.isAsync || false,
    hasAwait: temporal.asyncPatterns?.hasAwait || false,
    hasPromiseAll: temporal.asyncPatterns?.hasPromiseAll || false,
    hasPromiseRace: temporal.asyncPatterns?.hasPromiseRace || false,
    hasPromiseAllSettled: temporal.asyncPatterns?.hasPromiseAllSettled || false,
    hasNewPromise: temporal.asyncPatterns?.hasNewPromise || false,
    hasPromiseChain: temporal.asyncPatterns?.hasPromiseChain || false,
    sequentialCount: temporal.asyncPatterns?.sequentialOperations?.[0]?.count || 0,
    parallelOperations: temporal.asyncPatterns?.parallelOperations || [],
    sequentialOperations: temporal.asyncPatterns?.sequentialOperations || [],
    flowAnalysis: temporal.asyncFlowAnalysis || null,
    timers: temporal.timers || [],
    events: temporal.events || []
  };
}
