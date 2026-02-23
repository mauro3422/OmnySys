/**
 * @fileoverview utils.js
 * Funciones utilitarias compartidas entre los detectores de patrones
 */

/**
 * Verifica si un átomo es un script de análisis (herramienta interna)
 * @param {Object} atom - Átomo a verificar
 * @returns {boolean} true si es un script de análisis
 */
export function isAnalysisScript(atom) {
  return atom.purpose === 'ANALYSIS_SCRIPT' ||
    atom.filePath?.startsWith('scripts/audit') ||
    atom.filePath?.startsWith('scripts/analyze') ||
    atom.filePath?.startsWith('scripts/validate') ||
    atom.filePath?.startsWith('scripts/investigate');
}

/**
 * Verifica si un archivo es un archivo de test
 * @param {string} filePath - Ruta del archivo
 * @returns {boolean} true si es un archivo de test
 */
export function isTestFile(filePath) {
  if (!filePath) return false;
  return filePath.includes('.test.') || 
         filePath.includes('.spec.') ||
         filePath.includes('__tests__') ||
         filePath.includes('/tests/') ||
         filePath.includes('/test/') ||
         filePath.includes('/factories/') ||
         filePath.endsWith('.test.js') ||
         filePath.endsWith('.spec.js');
}

/**
 * Genera recomendación para una god function
 * @param {Object} atom - Átomo de la función
 * @returns {string} Recomendación personalizada
 */
export function getGodFunctionRecommendation(atom) {
  const recommendations = [];
  
  if (atom.complexity > 20) {
    recommendations.push('Break into smaller functions. Extract logical blocks to separate functions');
  }
  
  if (atom.linesOfCode > 100) {
    recommendations.push('Function is too long. Consider extracting helper functions');
  }
  
  if (atom.calls?.length > 15) {
    recommendations.push('Too many function calls. Consider using a dispatcher pattern');
  }
  
  if (atom.dna?.flowType === 'io-bound') {
    recommendations.push('I/O heavy function. Consider async batching or caching');
  }
  
  if (atom.performance?.complexity?.bigO?.includes('2^n') || 
      atom.performance?.complexity?.bigO?.includes('n!')) {
    recommendations.push('Review algorithm complexity - consider caching or optimization');
  }
  
  return recommendations.join('. ') || 'Consider refactoring for better maintainability';
}
