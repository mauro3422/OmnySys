/**
 * @fileoverview Pattern Categorizer - Categoriza patrones async
 */

/**
 * Categoriza un átomo en patrones async
 * @param {Object} atom - Átomo a categorizar
 * @param {Object} asyncInfo - Información async
 * @param {Object} patterns - Objeto para acumular patrones
 */
export function categorizePattern(atom, asyncInfo, patterns) {
  const entry = {
    id: atom.id,
    name: atom.name,
    file: atom.filePath,
    line: atom.line,
    complexity: atom.complexity
  };

  if (asyncInfo.sequentialCount > 0) {
    entry.count = asyncInfo.sequentialCount;
    patterns.sequentialAwaits.push(entry);
  }

  if (asyncInfo.hasPromiseAll) {
    entry.parallelCount = asyncInfo.parallelOperations?.length || 1;
    patterns.promiseAll.push(entry);
  }

  if (asyncInfo.hasPromiseChain) {
    patterns.promiseChains.push(entry);
  }

  if (asyncInfo.hasAwait && asyncInfo.hasPromiseChain) {
    patterns.mixedPatterns.push(entry);
  }
}
