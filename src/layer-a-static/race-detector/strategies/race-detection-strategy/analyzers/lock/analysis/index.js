/**
 * @fileoverview Lock Analysis Functions
 * @module race-detector/strategies/race-detection-strategy/analyzers/lock/analysis
 */

export { analyzeLockCoverage } from './coverage.js';
export { findPotentialDeadlocks } from './deadlock.js';
export { checkMitigation } from './mitigation.js';
