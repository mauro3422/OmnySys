/**
 * @fileoverview Performance Section Builder - Construye sección de performance
 */

/**
 * Construye la sección de performance
 * @param {Object} atom - Átomo con metadata de performance
 * @returns {Object|null} - Sección de performance o null
 */
export function buildPerformanceSection(atom) {
  if (!atom.performance) return null;

  const perf = atom.performance;

  return {
    complexity: perf.complexity ? {
      cyclomatic: perf.complexity.cyclomatic || atom.complexity,
      cognitive: perf.complexity.cognitive,
      bigO: perf.complexity.bigO
    } : null,
    expensiveOps: perf.expensiveOps ? {
      nestedLoops: perf.expensiveOps.nestedLoops || 0,
      recursion: perf.expensiveOps.recursion || false,
      blockingOps: perf.expensiveOps.blockingOps || [],
      heavyCalls: perf.expensiveOps.heavyCalls || []
    } : null,
    resources: perf.resources || null,
    estimates: perf.estimates ? {
      executionTime: perf.estimates.executionTime,
      blocking: perf.estimates.blocking,
      async: perf.estimates.async,
      expensiveWithCache: perf.estimates.expensiveWithCache
    } : null,
    impactScore: perf.impactScore
  };
}
