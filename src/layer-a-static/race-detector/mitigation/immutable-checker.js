/**
 * @fileoverview Immutable Data Checker
 * 
 * Detects usage of immutable data structures.
 * 
 * @module race-detector/mitigation/immutable-checker
 * @version 1.0.0
 */

import { findAtomById } from '../utils/index.js';

// Immutable patterns
const IMMUTABLE_PATTERNS = [
  /Immutable\./i,
  /\.asMutable\(/i,
  /\.asImmutable\(/i,
  /Object\.freeze\(/i,
  /Readonly</i,
  /immer/i,
  /produce\s*\(/i
];

/**
 * Check if access uses immutable data structures
 * @param {Object} access - Access point to check
 * @param {Object} project - Project data
 * @returns {boolean} - True if uses immutable data
 */
export function usesImmutableData(access, project) {
  const atom = findAtomById(access.atom, project);
  if (!atom?.code) return false;
  
  return IMMUTABLE_PATTERNS.some(pattern => pattern.test(atom.code));
}

/**
 * Get immutable library details
 * @param {Object} access - Access point
 * @param {Object} project - Project data
 * @returns {Object|null} - Immutable details or null
 */
export function getImmutableDetails(access, project) {
  const atom = findAtomById(access.atom, project);
  if (!atom?.code) return null;
  
  const libraryMap = [
    { pattern: /Immutable\./i, name: 'immutable-js' },
    { pattern: /immer/i, name: 'immer' },
    { pattern: /Object\.freeze\(/i, name: 'native-freeze' },
    { pattern: /Readonly</i, name: 'typescript-readonly' }
  ];
  
  for (const { pattern, name } of libraryMap) {
    if (pattern.test(atom.code)) {
      return {
        type: 'immutable',
        library: name,
        confidence: 'medium'
      };
    }
  }
  
  return null;
}
