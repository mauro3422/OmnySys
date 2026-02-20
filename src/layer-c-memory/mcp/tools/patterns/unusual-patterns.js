/**
 * @fileoverview unusual-patterns.js
 * Detecta patrones inusuales como exports no usados
 */

/**
 * Encuentra patrones inusuales en el código
 * @param {Array} atoms - Lista de átomos
 * @returns {Object} Patrones inusuales encontrados
 */
export function findUnusualPatterns(atoms) {
  const patterns = {
    unusedExports: [],
    highComplexityPrivate: [],
    longFunctions: []
  };
  
  for (const atom of atoms) {
    // Unused exports: exported but never called
    if (atom.isExported && (!atom.calledBy || atom.calledBy.length === 0)) {
      // Skip if it's a re-export or intentional export
      if (!atom.purpose?.includes?.('RE_EXPORT')) {
        patterns.unusedExports.push({
          id: atom.id,
          name: atom.name,
          file: atom.filePath,
          line: atom.line,
          reason: 'Exported but never called'
        });
      }
    }
    
    // High complexity private functions
    if (!atom.isExported && atom.complexity > 20) {
      patterns.highComplexityPrivate.push({
        id: atom.id,
        name: atom.name,
        file: atom.filePath,
        complexity: atom.complexity,
        reason: 'High complexity in private function'
      });
    }
    
    // Very long functions
    if (atom.linesOfCode > 100) {
      patterns.longFunctions.push({
        id: atom.id,
        name: atom.name,
        file: atom.filePath,
        linesOfCode: atom.linesOfCode,
        reason: 'Function exceeds 100 lines'
      });
    }
  }
  
  return patterns;
}
