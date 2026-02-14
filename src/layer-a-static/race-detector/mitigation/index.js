/**
 * @fileoverview Race Detector Mitigation - Index
 * 
 * Mitigation detection strategies for race conditions.
 * Each checker follows Single Responsibility Principle.
 * 
 * @module race-detector/mitigation
 * @version 1.0.0
 */

// Individual checkers
export {
  hasLockProtection,
  getLockDetails
} from './lock-checker.js';

export {
  isAtomicOperation,
  getAtomicDetails
} from './atomic-checker.js';

export {
  isInTransaction,
  sameTransaction,
  findTransactionContext
} from './transaction-checker.js';

export {
  hasAsyncQueue,
  sameQueue,
  getQueueDetails
} from './queue-checker.js';

export {
  usesImmutableData,
  getImmutableDetails
} from './immutable-checker.js';

export {
  sameBusinessFlow,
  analyzeBusinessFlow
} from './flow-checker.js';

// Main orchestrator
export { MitigationChecker } from './mitigation-checker.js';
