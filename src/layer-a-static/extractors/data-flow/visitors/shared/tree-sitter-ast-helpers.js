/**
 * @fileoverview Shared Tree-sitter AST helper adapters for data-flow visitors.
 */

import { text, startLine, endLine } from '../../../../parser/extractors/utils.js';
import {
  findFunctionNode,
  getIdentifierName
} from '../input-extractor/helpers/ast-helpers.js';

export {
  findFunctionNode,
  getIdentifierName
};

const FUNCTION_NODE_TYPES = [
  'function_declaration',
  'function_expression',
  'arrow_function',
  'method_definition',
  'generator_function_declaration',
  'generator_function'
];

/**
 * Get full path of a member expression (e.g. "a.b.c")
 * @param {Object} node - Tree-sitter node
 * @param {string} code - Source code
 * @returns {string|null}
 */
export function getMemberPath(node, code) {
  if (!node) return null;
  if (node.type === 'identifier') return text(node, code);
  if (node.type === 'this') return 'this';
  if (node.type === 'member_expression') {
    const object = node.childForFieldName('object');
    const property = node.childForFieldName('property');
    const objPath = object ? getMemberPath(object, code) : null;
    const propName = property ? text(property, code) : null;
    return objPath && propName ? `${objPath}.${propName}` : null;
  }
  return null;
}

/**
 * Get callee name from a call/new target
 * @param {Object} node - Tree-sitter node
 * @param {string} code - Source code
 * @returns {string}
 */
export function getCalleeName(node, code) {
  if (!node) return '<anonymous>';
  return getMemberPath(node, code) || text(node, code) || '<anonymous>';
}

/**
 * Get the target name of an assignment or member access
 * @param {Object} node - Tree-sitter node
 * @param {string} code - Source code
 * @returns {string|null}
 */
export function getAssignmentTarget(node, code) {
  if (!node) return null;
  if (node.type === 'identifier') return text(node, code);
  if (node.type === 'member_expression') return getMemberPath(node, code);
  if (node.type === 'this') return 'this';
  return null;
}

/**
 * Literal text of a node
 * @param {Object} node - Tree-sitter node
 * @param {string} code - Source code
 * @returns {string}
 */
export function nodeToString(node, code) {
  if (!node) return 'undefined';
  return text(node, code) || 'undefined';
}

/**
 * Check if a node is a function-like AST node.
 * @param {Object} node - Tree-sitter node
 * @returns {boolean}
 */
export function isFunctionNode(node) {
  return !!(node && FUNCTION_NODE_TYPES.includes(node.type));
}

export {
  endLine,
  startLine,
  text,
  FUNCTION_NODE_TYPES
};

export default {
  text,
  startLine,
  endLine,
  getIdentifierName,
  getMemberPath,
  getCalleeName,
  getAssignmentTarget,
  findFunctionNode,
  FUNCTION_NODE_TYPES,
  nodeToString,
  isFunctionNode
};
