/**
 * @fileoverview Shared Tree-sitter AST helper adapters for data-flow visitors.
 */

import {
  FUNCTION_NODE_TYPES,
  findFunctionNode as findSharedFunctionNode,
  getAssignmentTarget as getSharedAssignmentTarget,
  getCalleeName as getSharedCalleeName,
  getIdentifierName as getSharedIdentifierName,
  getMemberPath as getSharedMemberPath,
  text
} from '../../utils/ts-ast-utils.js';

export function getMemberPath(node, code) {
  return getSharedMemberPath(node, code);
}

export function getCalleeName(node, code) {
  return getSharedCalleeName(node, code);
}

export function getIdentifierName(node, code) {
  return getSharedIdentifierName(node, code);
}

export function getAssignmentTarget(node, code) {
  return getSharedAssignmentTarget(node, code);
}

export function nodeToString(node, code) {
  if (!node) return 'undefined';
  return text(node, code) || 'undefined';
}

export function isFunctionNode(node) {
  return !!(node && FUNCTION_NODE_TYPES.includes(node.type));
}

export function findFunctionNode(ast) {
  return findSharedFunctionNode(ast);
}
