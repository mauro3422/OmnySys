/**
 * @fileoverview Side Effect Extractor
 * 
 * Extrae información de side effects.
 * 
 * @module data-flow/output-extractor/extractors/side-effect-extractor
 * @version 1.0.0
 */

import { extractSources } from './source-extractor.js';
import { getCalleeName, getAssignmentTarget } from '../helpers/ast-helpers.js';
import { isSideEffectCall, classifySideEffect } from '../classifiers/side-effect-classifier.js';

/**
 * Extrae side effects de una expresión
 * @param {Object} expr - Nodo de expresión
 * @returns {Object|null}
 */
export function extractSideEffect(expr) {
  // Llamada a función con side effects
  if (expr.type === 'CallExpression' || expr.type === 'AwaitExpression') {
    const callExpr = expr.type === 'AwaitExpression' ? expr.argument : expr;
    
    if (callExpr.type === 'CallExpression') {
      const calleeName = getCalleeName(callExpr.callee);
      
      if (isSideEffectCall(calleeName)) {
        const sources = extractCallSources(callExpr);

        return {
          type: 'side_effect',
          target: calleeName,
          operation: classifySideEffect(calleeName),
          sources: sources,
          isAsync: expr.type === 'AwaitExpression',
          line: expr.loc?.start?.line
        };
      }
    }
  }

  // Assignment que muta: obj.prop = value
  if (expr.type === 'AssignmentExpression') {
    const target = getAssignmentTarget(expr.left);
    if (target && target.includes('.')) {
      const sources = extractSources(expr.right);
      
      return {
        type: 'side_effect',
        target: target,
        operation: 'property_mutation',
        sources: sources,
        line: expr.loc?.start?.line
      };
    }
  }

  // Delete: delete obj.prop
  if (expr.type === 'UnaryExpression' && expr.operator === 'delete') {
    const target = getAssignmentTarget(expr.argument);
    if (target) {
      return {
        type: 'side_effect',
        target: target,
        operation: 'deletion',
        line: expr.loc?.start?.line
      };
    }
  }

  return null;
}

/**
 * Extrae fuentes de una llamada a función
 * @param {Object} callExpr - CallExpression node
 * @returns {string[]}
 */
function extractCallSources(callExpr) {
  const sources = [];
  for (const arg of callExpr.arguments) {
    const name = getIdentifierName(arg);
    if (name) sources.push(name);
    
    // Spread
    if (arg.type === 'SpreadElement') {
      const spreadName = getIdentifierName(arg.argument);
      if (spreadName) sources.push(`...${spreadName}`);
    }
  }
  return sources;
}

// Import needed for getIdentifierName
import { getIdentifierName } from '../helpers/ast-helpers.js';

export default { extractSideEffect };
