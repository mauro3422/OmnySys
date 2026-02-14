/**
 * @fileoverview concurrency.js
 * 
 * Concurrency analysis functions
 * 
 * @module race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/analyzers/concurrency
 */

import { sameBusinessFlow, sameEntryPoint } from './flow.js';

/**
 * Check if two accesses can run concurrently
 * 
 * @param {Object} access1 - First access
 * @param {Object} access2 - Second access
 * @param {Object} project - Project data
 * @param {Object} analyzer - TimingAnalyzer instance
 * @returns {boolean} - True if can run concurrently
 */
export function canRunConcurrently(access1, access2, project, analyzer) {
  // Same atom = sequential
  if (access1.atom === access2.atom) return false;
  
  // Both sync and same flow = sequential
  if (!access1.isAsync && !access2.isAsync) {
    if (sameBusinessFlow(access1, access2, project, analyzer)) {
      return false;
    }
  }
  
  // At least one async = potentially concurrent
  if (access1.isAsync || access2.isAsync) return true;
  
  // Different entry points = potentially concurrent
  if (!sameEntryPoint(access1, access2, project, analyzer)) return true;
  
  return false;
}

/**
 * Analyze execution timing for a set of accesses
 * 
 * @param {Array} accesses - Array of access points
 * @param {Object} project - Project data
 * @param {Object} analyzer - TimingAnalyzer instance
 * @returns {Object} - Timing analysis result
 */
export function analyzeTiming(accesses, project, analyzer) {
  const concurrentPairs = [];
  
  for (let i = 0; i < accesses.length; i++) {
    for (let j = i + 1; j < accesses.length; j++) {
      if (canRunConcurrently(accesses[i], accesses[j], project, analyzer)) {
        concurrentPairs.push([accesses[i], accesses[j]]);
      }
    }
  }
  
  return {
    totalAccesses: accesses.length,
    concurrentPairs: concurrentPairs.length,
    pairs: concurrentPairs,
    isConcurrent: concurrentPairs.length > 0
  };
}
