/**
 * Performance analyzer
 * @module mcp/tools/suggest-refactoring/performance-analyzer
 */

/**
 * Sugiere mejoras de performance
 * @param {Array} atoms - Array of atoms
 * @returns {Array} - Array of suggestions
 */
export function analyzePerformance(atoms) {
  const suggestions = [];
  
  for (const atom of atoms) {
    // Nested loops
    if (atom.performance?.expensiveOps?.nestedLoops >= 2) {
      suggestions.push({
        type: 'optimize_loops',
        severity: atom.performance.expensiveOps.nestedLoops >= 3 ? 'high' : 'medium',
        target: atom.id,
        name: atom.name,
        file: atom.filePath,
        line: atom.line,
        suggestion: `Optimize ${atom.performance.expensiveOps.nestedLoops}x nested loops`,
        reason: `O(n^${atom.performance.expensiveOps.nestedLoops}) complexity detected`,
        alternatives: [
          'Use Map/Set for O(1) lookups',
          'Consider preprocessing data',
          'Use early exit conditions'
        ]
      });
    }
    
    // Funciones recursivas sin memoización
    if (atom.performance?.expensiveOps?.recursion && atom.calls?.some(c => c.name === atom.name)) {
      suggestions.push({
        type: 'add_memoization',
        severity: 'medium',
        target: atom.id,
        name: atom.name,
        file: atom.filePath,
        line: atom.line,
        suggestion: 'Add memoization to recursive function',
        reason: 'Recursive calls may recalculate same values',
        benefit: 'O(n) space for O(1) lookup time'
      });
    }
  }
  
  return suggestions;
}
