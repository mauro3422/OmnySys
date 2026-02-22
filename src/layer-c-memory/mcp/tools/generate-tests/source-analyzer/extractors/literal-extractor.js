/**
 * @fileoverview Literal Extractor - Extrae literales del código
 */

/**
 * Extrae literales del código para usar como ejemplos
 * @param {string} sourceCode - Código fuente
 * @returns {Array} - Array de ejemplos literales
 */
export function extractLiterals(sourceCode) {
  const examples = [];

  // Strings
  const stringRegex = /["']([^"']+)["']/g;
  let match;
  while ((match = stringRegex.exec(sourceCode)) !== null) {
    if (match[1].length > 2 && match[1].length < 50) {
      examples.push({
        type: 'string',
        value: match[1],
        context: 'Usado en el código'
      });
    }
  }

  // Números específicos
  const numberRegex = /\b(\d{2,})\b/g;
  while ((match = numberRegex.exec(sourceCode)) !== null) {
    examples.push({
      type: 'number',
      value: parseInt(match[1]),
      context: 'Valor numérico usado'
    });
  }

  // Objetos JSON-like
  const objectRegex = /{\s*[\w"]+\s*:\s*[^}]+}/g;
  while ((match = objectRegex.exec(sourceCode)) !== null) {
    try {
      // Intentar parsear para ver si es JSON válido
      const parsed = JSON.parse(match[0]);
      examples.push({
        type: 'object',
        value: parsed,
        context: 'Objeto usado en el código'
      });
    } catch {
      // No es JSON válido, ignorar
    }
  }

  return examples;
}
