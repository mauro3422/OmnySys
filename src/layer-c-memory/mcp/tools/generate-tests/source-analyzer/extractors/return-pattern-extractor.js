/**
 * @fileoverview Return Pattern Extractor - Extrae patrones de return
 */

/**
 * Extrae patrones de return del código
 * @param {string} sourceCode - Código fuente
 * @returns {Array} - Array de patrones de return
 */
export function extractReturnPatterns(sourceCode) {
  const patterns = [];

  // Buscar returns con valores específicos — solo literales simples (no multiline)
  const returnRegex = /return\s+(true|false|null|\d+|"[^"\n]{1,40}"|'[^'\n]{1,40}'|\[[^\]\n]{0,40}\])/g;
  let match;

  while ((match = returnRegex.exec(sourceCode)) !== null) {
    const value = match[1];
    patterns.push({
      type: 'return-value',
      value: value,
      suggestion: `Test que verifique return ${value}`
    });
  }

  return patterns;
}
