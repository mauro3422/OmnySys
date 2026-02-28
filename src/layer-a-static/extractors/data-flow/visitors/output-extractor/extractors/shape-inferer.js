/**
 * @fileoverview Shape Inferer
 * 
 * Infiere el shape/tipo del valor retornado.
 * 
 * @module data-flow/output-extractor/extractors/shape-inferer
 * @version 1.0.0
 */

import { startLine, text, getMemberPath } from '../../../utils/ts-ast-utils.js';

function getCalleeName(node, code) {
  if (!node) return '<anonymous>';
  return getMemberPath(node, code) || text(node, code) || '<anonymous>';
}

function nodeToString(node, code) {
  if (!node) return 'undefined';
  return text(node, code);
}

/**
 * Infiere el shape del return basado en el nodo (Tree-sitter)
 * @param {Object} node - Nodo Tree-sitter
 * @param {string} code - Código fuente
 * @returns {string}
 */
export function inferShape(node, code) {
  if (!node) return 'undefined';

  if (node.type === 'object') {
    const props = [];
    for (const child of node.namedChildren) {
      if (child.type === 'pair') {
        const keyNode = child.childForFieldName('key');
        if (keyNode) props.push(text(keyNode, code));
      } else if (child.type === 'shorthand_property_identifier') {
        props.push(text(child, code));
      }
    }
    return props.length > 0 ? `{ ${props.join(', ')} }` : '{}';
  }

  if (node.type === 'array') {
    return `[${node.namedChildCount}]`;
  }

  if (node.type === 'identifier') {
    return text(node, code);
  }

  if (node.type === 'string') return 'string';
  if (node.type === 'number') return 'number';
  if (node.type === 'false' || node.type === 'true') return 'boolean';
  if (node.type === 'null') return 'null';
  if (node.type === 'undefined') return 'undefined';

  if (node.type === 'call_expression') {
    const calleeNode = node.childForFieldName('function');
    const name = getCalleeName(calleeNode, code);
    return `<${name}()>`;
  }

  if (node.type === 'await_expression') {
    return `<Promise>`;
  }

  if (node.type === 'binary_expression') {
    return inferBinaryShape(node, code);
  }

  if (node.type === 'member_expression') {
    return '<property>';
  }

  return 'expression';
}

/**
 * Infiere shape de operación binaria
 * @param {Object} node - BinaryExpression node
 * @returns {string}
 */
function inferBinaryShape(node, code) {
  const arithmeticOps = ['+', '-', '*', '/', '%', '**'];
  const comparisonOps = ['===', '!==', '==', '!=', '<', '>', '<=', '>='];
  const logicalOps = ['&&', '||'];

  const operator = node.children.find(c => !c.isNamed && !['(', ')'].includes(c.type))?.type || 'unknown';

  if (arithmeticOps.includes(operator)) {
    return operator === '+' ? 'string|number' : 'number';
  }
  if (comparisonOps.includes(operator) || logicalOps.includes(operator)) {
    return 'boolean';
  }
  return 'expression';
}

/**
 * Extrae propiedades de un objeto
 * @param {Object} node - ObjectExpression node
 * @returns {Array<{name: string, value: string}>}
 */
export function extractProperties(node, code) {
  if (node.type !== 'object') return [];

  const props = [];
  for (const child of node.namedChildren) {
    if (child.type === 'pair') {
      const keyNode = child.childForFieldName('key');
      const valueNode = child.childForFieldName('value');
      if (keyNode && valueNode) {
        props.push({
          name: text(keyNode, code),
          value: nodeToString(valueNode, code)
        });
      }
    } else if (child.type === 'shorthand_property_identifier') {
      const name = text(child, code);
      props.push({
        name,
        value: name
      });
    }
  }
  return props;
}

// Utility removed as it's now internal or from shared

export default { inferShape, extractProperties };
