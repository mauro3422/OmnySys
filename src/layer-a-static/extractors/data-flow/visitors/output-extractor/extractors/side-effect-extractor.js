/**
 * @fileoverview Side Effect Extractor
 * 
 * Extrae información de side effects.
 * 
 * @module data-flow/output-extractor/extractors/side-effect-extractor
 * @version 1.0.0
 */

import { extractSources } from './source-extractor.js';
import { getMemberPath, text, startLine } from '../../../utils/ts-ast-utils.js';
import { isSideEffectCall, classifySideEffect } from '../classifiers/side-effect-classifier.js';

/**
 * Get callee name from function node
 * @param {Object} node - Tree-sitter node
 * @param {string} code - Source code
 * @returns {string|null}
 */
function getCalleeName(node, code) {
    if (!node) return null;
    if (node.type === 'identifier') return text(node, code);
    if (node.type === 'member_expression') return getMemberPath(node, code);
    return null;
}

function getAssignmentTarget(node, code) {
  if (node.type === 'identifier') return text(node, code);
  if (node.type === 'member_expression') return getMemberPath(node, code);
  return null;
}

/**
 * Extrae side effects de una expresión
 * @param {Object} expr - Nodo de expresión
 * @returns {Object|null}
 */
export function extractSideEffect(expr, code, options = {}) {
  // Llamada a función con side effects
  if (expr.type === 'call_expression' || expr.type === 'await_expression') {
    const callExpr = expr.type === 'await_expression' ? expr.namedChildren[0] : expr;

    if (callExpr && callExpr.type === 'call_expression') {
      const calleeNode = callExpr.childForFieldName('function');
      const calleeName = getCalleeName(calleeNode, code);

      if (isSideEffectCall(calleeName)) {
        const sources = extractCallSources(callExpr, code);

        return {
          type: 'side_effect',
          target: calleeName,
          operation: classifySideEffect(calleeName),
          sources: sources,
          isAsync: expr.type === 'await_expression',
          line: startLine(expr)
        };
      }
    }
  }

  // Assignment que muta: obj.prop = value
  if (expr.type === 'assignment_expression') {
    const leftNode = expr.childForFieldName('left');
    const rightNode = expr.childForFieldName('right');
    const target = getAssignmentTarget(leftNode, code);

    if (target && target.includes('.')) {
      const sources = extractSources(rightNode, code);

      return {
        type: 'side_effect',
        target: target,
        operation: 'property_mutation',
        sources: sources,
        line: startLine(expr)
      };
    }
  }

  // Delete: delete obj.prop
  if (expr.type === 'unary_expression') {
    const operatorNode = expr.children.find(c => c.type === 'delete');
    if (operatorNode) {
      const argNode = expr.namedChildren[0];
      const target = getAssignmentTarget(argNode, code);
      if (target) {
        return {
          type: 'side_effect',
          target: target,
          operation: 'deletion',
          line: startLine(expr)
        };
      }
    }
  }

  return null;
}

/**
 * Extrae fuentes de una llamada a función
 * @param {Object} callExpr - CallExpression node
 * @returns {string[]}
 */
function extractCallSources(callExpr, code) {
  const sources = [];
  const argumentsNode = callExpr.childForFieldName('arguments');
  if (!argumentsNode) return [];

  for (const arg of argumentsNode.namedChildren) {
    if (arg.type === 'identifier') {
      sources.push(text(arg, code));
    } else if (arg.type === 'spread_element') {
      const idNode = arg.namedChildren.find(c => c.type === 'identifier');
      if (idNode) sources.push(`...${text(idNode, code)}`);
    } else if (arg.type === 'member_expression') {
      const path = getMemberPath(arg, code);
      if (path) sources.push(path);
    }
  }
  return sources;
}

// Utility removed as it's now internal or from shared

export default { extractSideEffect };
