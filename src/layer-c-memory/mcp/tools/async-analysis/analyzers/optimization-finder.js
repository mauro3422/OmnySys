/**
 * @fileoverview Optimization Finder - Encuentra oportunidades de optimización
 */

/**
 * Encuentra optimizaciones posibles para un átomo async
 * @param {Object} atom - Átomo a analizar
 * @param {Object} asyncInfo - Información async
 * @returns {Array} - Array de optimizaciones sugeridas
 */
export function findOptimizations(atom, asyncInfo) {
  const optimizations = [];
  
  if (asyncInfo.sequentialCount >= 5 && !asyncInfo.hasPromiseAll) {
    optimizations.push({
      atom: atom.id,
      atomName: atom.name,
      file: atom.filePath,
      line: atom.line,
      type: 'parallelization_opportunity',
      potentialGain: `~${Math.round((1 - 1/asyncInfo.sequentialCount) * 100)}% time reduction`,
      action: `Wrap ${asyncInfo.sequentialCount} sequential awaits in Promise.all() if they're independent`
    });
  }

  if (asyncInfo.hasPromiseChain && asyncInfo.hasAwait) {
    optimizations.push({
      atom: atom.id,
      atomName: atom.name,
      file: atom.filePath,
      line: atom.line,
      type: 'modernization',
      potentialGain: 'Better readability and error handling',
      action: 'Replace .then() chains with pure async/await'
    });
  }

  return optimizations;
}
