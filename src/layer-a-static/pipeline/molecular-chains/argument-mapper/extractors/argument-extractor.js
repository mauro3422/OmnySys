/**
 * @fileoverview Argument code extraction utilities
 * @module molecular-chains/argument-mapper/extractors/argument-extractor
 */

/**
 * Extracts code representation from an argument
 * @param {Object} arg - Argument object
 * @returns {string} Code representation
 */
export function extractArgumentCode(arg) {
  if (typeof arg === 'string') return arg;
  if (arg.name) return arg.name;
  if (arg.code) return arg.code;
  
  // Reconstruct code
  if (arg.type === 'MemberExpression') {
    return `${arg.object}.${arg.property}`;
  }
  
  if (arg.type === 'CallExpression') {
    const args = (arg.arguments || []).map(a => extractArgumentCode(a)).join(', ');
    return `${arg.callee}(${args})`;
  }
  
  return '[expression]';
}

/**
 * Extracts the root variable from an argument
 * @param {Object} arg - Argument object
 * @returns {string|null} Root variable name
 */
export function extractRootVariable(arg) {
  if (arg.type === 'Identifier') {
    return arg.name;
  }
  
  if (arg.type === 'MemberExpression') {
    // For order.items, return order
    return arg.object?.name || arg.object;
  }
  
  if (arg.variable) {
    return arg.variable;
  }
  
  return null;
}

export default { extractArgumentCode, extractRootVariable };
