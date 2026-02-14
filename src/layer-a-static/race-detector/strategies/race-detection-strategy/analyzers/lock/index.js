/**
 * @fileoverview Lock Analyzer Module
 * 
 * @module race-detector/strategies/race-detection-strategy/analyzers/lock
 * @version 0.9.4 - Modularizado
 */

export { LockAnalyzer } from './LockAnalyzer.js';
export {
  detectExplicitLock,
  detectMonitorPattern,
  detectAtomicOperation,
  detectTransactionalContext
} from './detectors/index.js';
export {
  analyzeLockCoverage,
  findPotentialDeadlocks,
  checkMitigation
} from './analysis/index.js';
export { determineScope } from './utils/index.js';

export { default } from './LockAnalyzer.js';
