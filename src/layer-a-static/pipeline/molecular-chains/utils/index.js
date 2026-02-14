/**
 * @fileoverview index.js
 * 
 * Utility functions for molecular chains.
 * 
 * @module molecular-chains/utils
 */

/**
 * Check if atom is a valid chain node
 * @param {Object} atom - Atom to check
 * @returns {boolean}
 */
export function isValidChainNode(atom) {
  return atom && typeof atom.id === 'string' && typeof atom.name === 'string';
}

/**
 * Get unique functions from chains
 * @param {Array} chains - Chain objects
 * @returns {Set} - Unique function names
 */
export function getUniqueFunctions(chains) {
  const functions = new Set();
  for (const chain of chains) {
    for (const step of chain.steps || []) {
      functions.add(step.function);
    }
  }
  return functions;
}
