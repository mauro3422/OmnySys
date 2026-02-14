/**
 * @fileoverview Shape Inferer
 * 
 * Infiere el shape/tipo del valor retornado.
 * 
 * @module data-flow/output-extractor/extractors/shape-inferer
 * @version 1.0.0
 */

import { getCalleeName } from '../helpers/ast-helpers.js';

/**
 * Infiere el shape del return basado en el nodo
 * @param {Object} node - Nodo AST
 * @returns {string}
 */
export function inferShape(node) {
  if (!node) return 'undefined';

  if (node.type === 'ObjectExpression') {
    const props = node.properties
      .filter(p => p.type === 'ObjectProperty' || p.type === 'Property')
      .map(p => p.key.name || p.key.value);
    return props.length > 0 ? `{ ${props.join(', ')} }` : '{}';
  }

  if (node.type === 'ArrayExpression') {
    return `[${node.elements?.length || 0}]`;
  }

  if (node.type === 'Identifier') {
    return node.name;
  }

  if (node.type === 'StringLiteral') return 'string';
  if (node.type === 'NumericLiteral') return 'number';
  if (node.type === 'BooleanLiteral') return 'boolean';
  if (node.type === 'NullLiteral') return 'null';

  if (node.type === 'CallExpression') {
    const name = getCalleeName(node.callee);
    return `<${name}()>`;
  }

  if (node.type === 'AwaitExpression') {
    return `<Promise>`;
  }

  if (node.type === 'BinaryExpression') {
    return inferBinaryShape(node);
  }

  if (node.type === 'MemberExpression') {
    return '<property>';
  }

  return 'expression';
}

/**
 * Infiere shape de operación binaria
 * @param {Object} node - BinaryExpression node
 * @returns {string}
 */
function inferBinaryShape(node) {
  const arithmeticOps = ['+', '-', '*', '/', '%', '**'];
  const comparisonOps = ['===', '!==', '==', '!=', '<', '>', '<=', '>='];
  const logicalOps = ['&&', '||'];
  
  if (arithmeticOps.includes(node.operator)) {
    return node.operator === '+' ? 'string|number' : 'number';
  }
  if (comparisonOps.includes(node.operator) || logicalOps.includes(node.operator)) {
    return 'boolean';
  }
  return 'expression';
}

/**
 * Extrae propiedades de un objeto
 * @param {Object} node - ObjectExpression node
 * @returns {Array<{name: string, value: string}>}
 */
export function extractProperties(node) {
  if (node.type !== 'ObjectExpression') return [];
  
  return (node.properties || [])
    .filter(p => p.type === 'ObjectProperty' || p.type === 'Property')
    .map(p => ({
      name: p.key.name || p.key.value,
      value: nodeToString(p.value)
    }));
}

// Import needed for extractProperties
import { nodeToString } from '../helpers/ast-helpers.js';

export default { inferShape, extractProperties };
