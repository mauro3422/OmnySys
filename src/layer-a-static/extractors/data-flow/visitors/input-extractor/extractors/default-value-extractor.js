/**
 * @fileoverview Default Value Extractor
 * 
 * Extrae valores por defecto de parámetros.
 * 
 * @module data-flow/input-extractor/extractors/default-value-extractor
 * @version 1.0.0
 */

/**
 * Extrae el valor default como string
 * @param {Object} node - Nodo AST del valor default
 * @returns {string|null}
 */
export function extractDefaultValue(node) {
  if (!node) return null;

  if (node.type === 'StringLiteral') return `"${node.value}"`;
  if (node.type === 'NumericLiteral') return String(node.value);
  if (node.type === 'BooleanLiteral') return String(node.value);
  if (node.type === 'NullLiteral') return 'null';
  if (node.type === 'ArrayExpression' && node.elements.length === 0) return '[]';
  if (node.type === 'ObjectExpression' && node.properties.length === 0) return '{}';

  return `<${node.type}>`;
}

export default { extractDefaultValue };
