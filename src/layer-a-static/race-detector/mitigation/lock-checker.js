/**
 * @fileoverview Lock Protection Checker
 * 
 * Detects various locking mechanisms (mutexes, semaphores, distributed locks).
 * Follows Single Responsibility Principle.
 * 
 * @module race-detector/mitigation/lock-checker
 * @version 1.0.0
 */

import { findAtomById } from '../utils/index.js';

// Lock patterns for different technologies
const LOCK_PATTERNS = [
  // Mutexes and semaphores
  /\b(mutex|lock|semaphore)\./i,
  /\bLock\s*\(/i,
  /\bacquire\s*\(/i,
  /\bwithLock\s*\(/i,
  /await\s+.*\.lock\(/i,
  /Atomics\./i,
  /navigator\.locks/i,
  
  // JavaScript/TypeScript specific
  /navigator\.locks\.request/i,
  /LockManager/i,
  
  // Framework patterns
  /\.mutate\(/i,           // TanStack Query / React Query
  /useMutation\(/i,        // React Query
  
  // Database locks
  /SELECT.*FOR\s+UPDATE/i,
  /LOCK\s+TABLES/i,
  
  // Distributed locks
  /redis.*lock/i,
  /redlock/i,
  /etcd.*lock/i,
  /zookeeper.*lock/i,
  
  // Language-specific constructs
  /synchronized\s*\(/i,
  /@synchronized/i,
  /ReentrantLock/i
];

/**
 * Check if access has lock protection
 * @param {Object} access - Access point to check
 * @param {Object} project - Project data
 * @returns {boolean} - True if protected by lock
 */
export function hasLockProtection(access, project) {
  if (!access || !access.atom || !project) return false;
  const atom = findAtomById(access.atom, project);
  if (!atom?.code) return false;

  return LOCK_PATTERNS.some(pattern => pattern.test(atom.code));
}

/**
 * Get lock details if present
 * @param {Object} access - Access point to check
 * @param {Object} project - Project data
 * @returns {Object|null} - Lock details or null
 */
export function getLockDetails(access, project) {
  if (!access || !access.atom || !project) return null;
  const atom = findAtomById(access.atom, project);
  if (!atom?.code) return null;
  
  for (const pattern of LOCK_PATTERNS) {
    const match = atom.code.match(pattern);
    if (match) {
      return {
        type: 'lock',
        pattern: match[0],
        confidence: 'high'
      };
    }
  }
  
  return null;
}
