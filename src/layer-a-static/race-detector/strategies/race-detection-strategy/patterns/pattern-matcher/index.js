/**
 * @fileoverview index.js
 * 
 * Pattern Matcher - Main entry point (backward compatible)
 * 
 * High-level pattern matching orchestrator that coordinates between
 * analyzers and the pattern registry to detect specific race conditions.
 * Provides a unified interface for race detection algorithms.
 * 
 * @module race-detector/strategies/race-detection-strategy/patterns/pattern-matcher
 */

import { PatternMatcher } from './matchers/core.js';

/**
 * @typedef {Object} MatchResult
 * @property {boolean} matches - Whether pattern matches
 * @property {string} [type] - Matched pattern type
 * @property {string} [name] - Matched pattern name
 * @property {string} [severity] - Severity level
 * @property {Object} [context] - Additional match context
 */

/**
 * @typedef {Object} MatcherConfig
 * @property {PatternRegistry} [registry] - Custom pattern registry
 * @property {boolean} [checkTiming=true] - Whether to check timing
 * @property {boolean} [checkLocks=true] - Whether to check lock protection
 * @property {boolean} [checkConcurrency=true] - Whether to verify concurrency
 */

export { PatternMatcher };
export default PatternMatcher;
