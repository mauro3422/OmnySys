/**
 * @fileoverview index.js
 * 
 * Timing Analyzer - Main entry point (backward compatible)
 * 
 * Analyzes timing and execution context to determine if two operations
 * can run concurrently. Includes business flow analysis, entry point
 * detection, and async context evaluation.
 * 
 * @module race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer
 */

import { canRunConcurrently, analyzeTiming } from './analyzers/concurrency.js';
import { sameBusinessFlow, sameEntryPoint } from './analyzers/flow.js';
import { haveSameAwaitContext } from './analyzers/patterns.js';
import { getAtomCallers, findEntryPoints, findAtomById } from './detectors/atom-finder.js';

/**
 * Analyzer for timing and concurrency patterns
 */
export class TimingAnalyzer {
  constructor() {
    this._cache = new WeakMap();
  }

  canRunConcurrently(access1, access2, project) {
    return canRunConcurrently(access1, access2, project, this);
  }

  sameBusinessFlow(access1, access2, project) {
    return sameBusinessFlow(access1, access2, project, this);
  }

  sameEntryPoint(access1, access2, project) {
    return sameEntryPoint(access1, access2, project, this);
  }

  haveSameAwaitContext(access1, access2, project) {
    return haveSameAwaitContext(access1, access2, project, this);
  }

  getAtomCallers(atomId, project) {
    return getAtomCallers(atomId, project);
  }

  findEntryPoints(atomId, project) {
    return findEntryPoints(atomId, project);
  }

  findAtomById(atomId, project) {
    return findAtomById(atomId, project);
  }

  analyzeTiming(accesses, project) {
    return analyzeTiming(accesses, project, this);
  }
}

export default TimingAnalyzer;
