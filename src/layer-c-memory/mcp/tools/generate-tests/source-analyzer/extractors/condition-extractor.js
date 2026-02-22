/**
 * @fileoverview Condition Extractor - Extrae condiciones del código
 */

/**
 * Extrae condiciones interesantes para tests
 * @param {string} sourceCode - Código fuente
 * @returns {Array} - Array de patrones de condiciones
 */
export function extractConditions(sourceCode) {
  const patterns = [];

  // Detectar switches
  if (sourceCode.includes('switch')) {
    patterns.push({
      type: 'switch',
      suggestion: 'Test para cada case del switch'
    });
  }

  // Detectar múltiples ifs/else if
  const elseIfCount = (sourceCode.match(/else\s+if/g) || []).length;
  if (elseIfCount > 2) {
    patterns.push({
      type: 'multi-branch',
      count: elseIfCount + 1,
      suggestion: `Test para cada rama (${elseIfCount + 1} branches)`
    });
  }

  // Detectar for/while loops
  const loopCount = (sourceCode.match(/\b(for|while)\s*\(/g) || []).length;
  if (loopCount > 0) {
    patterns.push({
      type: 'loop',
      count: loopCount,
      suggestion: 'Test con arrays vacíos, un elemento, múltiples elementos'
    });
  }

  // Detectar try/catch
  if (sourceCode.includes('try') && sourceCode.includes('catch')) {
    patterns.push({
      type: 'error-handling',
      suggestion: 'Test que fuerce error en el try block'
    });
  }

  return patterns;
}
