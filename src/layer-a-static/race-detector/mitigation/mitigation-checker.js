/**
 * @fileoverview Mitigation Checker
 * 
 * Central orchestrator for all mitigation checks.
 * Follows Strategy pattern to check multiple mitigation types.
 * 
 * @module race-detector/mitigation/mitigation-checker
 * @version 1.0.0
 */

import {
  hasLockProtection,
  getLockDetails
} from './lock-checker.js';

import {
  isAtomicOperation,
  getAtomicDetails
} from './atomic-checker.js';

import {
  isInTransaction,
  sameTransaction,
  findTransactionContext
} from './transaction-checker.js';

import {
  hasAsyncQueue,
  sameQueue
} from './queue-checker.js';

import {
  usesImmutableData
} from './immutable-checker.js';

import {
  sameBusinessFlow,
  analyzeBusinessFlow
} from './flow-checker.js';

/**
 * Mitigation Checker - Orchestrates all mitigation detection
 */
export class MitigationChecker {
  constructor(project, strategies = []) {
    this.project = project;
    this.strategies = strategies;
  }
  
  /**
   * Find mitigation for a detected race condition
   * @param {Object} race - Race condition object
   * @returns {Object|null} - Mitigation info or null if not mitigated
   */
  findMitigation(race) {
    if (!race || !race.accesses || race.accesses.length < 2) {
      return null;
    }
    const [access1, access2] = race.accesses;
    const mitigations = [];
    
    // Check 1: Explicit locks
    const lock1 = hasLockProtection(access1, this.project);
    const lock2 = hasLockProtection(access2, this.project);
    if (lock1 && lock2) {
      const details = getLockDetails(access1, this.project);
      return {
        type: 'lock',
        description: 'Both accesses protected by locks',
        details,
        confidence: 'high'
      };
    } else if (lock1 || lock2) {
      mitigations.push({
        type: 'partial-lock',
        description: 'Only one access has lock protection',
        confidence: 'low'
      });
    }
    
    // Check 2: Same transaction
    if (sameTransaction(access1, access2, this.project)) {
      return {
        type: 'transaction',
        description: 'Both accesses in same database transaction',
        confidence: 'high'
      };
    }
    
    // Check 3: Both operations are atomic
    const atomic1 = isAtomicOperation(access1, this.project);
    const atomic2 = isAtomicOperation(access2, this.project);
    if (atomic1 && atomic2) {
      return {
        type: 'atomic',
        description: 'Both operations are atomic',
        confidence: 'high'
      };
    }
    
    // Check 4: Async queue serialization
    const queue1 = hasAsyncQueue(access1, this.project);
    const queue2 = hasAsyncQueue(access2, this.project);
    if (queue1 && queue2 && sameQueue(access1, access2, this.project)) {
      return {
        type: 'queue',
        description: 'Serialized by async queue',
        confidence: 'high'
      };
    }
    
    // Check 5: Same business flow
    const flowAnalysis = analyzeBusinessFlow(access1, access2, this.project, this.strategies);
    if (flowAnalysis) {
      return {
        type: 'sequential',
        ...flowAnalysis
      };
    }
    
    // Check 6: Immutable data structures
    if (usesImmutableData(access1, this.project) && usesImmutableData(access2, this.project)) {
      return {
        type: 'immutable',
        description: 'Uses immutable data structures',
        confidence: 'medium'
      };
    }
    
    // Return strongest partial mitigation or null
    if (mitigations.length > 0) {
      return mitigations[0];
    }
    
    return null;
  }
  
  /**
   * Check if race has complete mitigation
   * @param {Object} race - Race condition
   * @returns {boolean} - True if completely mitigated
   */
  isFullyMitigated(race) {
    const mitigation = this.findMitigation(race);
    if (!mitigation) return false;
    
    return !mitigation.type.startsWith('partial-') && 
           mitigation.confidence === 'high';
  }
}

export default MitigationChecker;
