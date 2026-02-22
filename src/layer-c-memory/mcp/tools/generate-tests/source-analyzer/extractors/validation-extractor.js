/**
 * @fileoverview Validation Extractor - Extrae validaciones del código
 */

/**
 * Extrae validaciones del código - SOLO para parámetros de entrada
 * @param {string} sourceCode - Código fuente
 * @param {Array} inputParams - Parámetros de entrada
 * @returns {Array} - Array de patrones de validación
 */
export function extractValidations(sourceCode, inputParams = []) {
  const patterns = [];
  const inputNames = inputParams.map(p => p.name);

  // if (!variable) patterns - SOLO si variable es un parámetro de entrada
  const notValidRegex = /if\s*\(\s*!+(\w+)/g;
  let match;
  while ((match = notValidRegex.exec(sourceCode)) !== null) {
    if (inputNames.includes(match[1])) {
      patterns.push({
        type: 'validation',
        variable: match[1],
        condition: `!${match[1]}`,
        suggestion: `Test con ${match[1]} = null/undefined`
      });
    }
  }

  // if (variable === value) patterns - SOLO si variable es un parámetro
  const equalsRegex = /if\s*\(\s*(\w+)\s*===?\s*["']?(\w+)["']?\)/g;
  while ((match = equalsRegex.exec(sourceCode)) !== null) {
    if (inputNames.includes(match[1])) {
      patterns.push({
        type: 'condition',
        variable: match[1],
        value: match[2],
        suggestion: `Test con ${match[1]} = ${match[2]}`
      });
    }
  }

  // .includes(), .indexOf(), .has()
  const methodRegex = /\.includes?\(["']?(\w+)["']?\)/g;
  while ((match = methodRegex.exec(sourceCode)) !== null) {
    patterns.push({
      type: 'membership',
      value: match[1],
      suggestion: `Test con valor "${match[1]}" incluido/excluido`
    });
  }

  return patterns;
}
