/**
 * @fileoverview Atomic Operation Checker
 * 
 * Detects atomic operations at hardware, database, and language levels.
 * 
 * @module race-detector/mitigation/atomic-checker
 * @version 1.0.0
 */

import { findAtomById } from '../utils/index.js';

// Atomic patterns
const ATOMIC_PATTERNS = [
  /Atomics\.(add|sub|and|or|xor|exchange|compareExchange|load|store)\(/i
];

// Database atomic patterns
const DB_ATOMIC_PATTERNS = [
  /\.findOneAndUpdate\(/i,
  /\.findOneAndReplace\(/i,
  /\.findOneAndDelete\(/i,
  /UPSERT/i,
  /ON\s+CONFLICT/i,
  /INSERT\s+OR\s+REPLACE/i
];

/**
 * Check if operation is atomic
 * @param {Object} access - Access point to check
 * @param {Object} project - Project data
 * @returns {boolean} - True if operation is atomic
 */
export function isAtomicOperation(access, project) {
  const atom = findAtomById(access.atom, project);
  if (!atom?.code) return false;

  // Check Atomics API
  if (ATOMIC_PATTERNS.some(p => p.test(atom.code))) {
    return true;
  }
  
  // Check database atomic operations
  if (DB_ATOMIC_PATTERNS.some(p => p.test(atom.code))) {
    return true;
  }
  
  // Check single-line synchronous operations on primitives
  const lines = atom.code.split('\n');
  const isSingleLineSync = lines.length <= 1 && !access.isAsync;
  const isPrimitiveOperation = /^(const|let|var)?\s*\w+\s*[\+\-\*\/]=/.test(atom.code.trim());
  
  return isSingleLineSync && isPrimitiveOperation;
}

/**
 * Get atomic operation details
 * @param {Object} access - Access point to check
 * @param {Object} project - Project data
 * @returns {Object|null} - Atomic details or null
 */
export function getAtomicDetails(access, project) {
  const atom = findAtomById(access.atom, project);
  if (!atom?.code) return null;
  
  // Check Atomics API
  for (const pattern of ATOMIC_PATTERNS) {
    const match = atom.code.match(pattern);
    if (match) {
      return {
        type: 'atomics-api',
        operation: match[1],
        confidence: 'high'
      };
    }
  }
  
  // Check database operations
  for (const pattern of DB_ATOMIC_PATTERNS) {
    if (pattern.test(atom.code)) {
      return {
        type: 'db-atomic',
        confidence: 'high'
      };
    }
  }
  
  return null;
}
