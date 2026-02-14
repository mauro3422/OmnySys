/**
 * @fileoverview index.js
 * 
 * Main entry point for the race detection strategy module.
 * Re-exports all public APIs with backward-compatible aliases.
 * 
 * @module race-detector/strategies/race-detection-strategy
 */

// Core Strategy Class
export { RaceDetectionStrategy } from './RaceDetectionStrategy.js';
export { RaceDetectionStrategy as default } from './RaceDetectionStrategy.js';

// Analyzers
export { SharedStateAnalyzer } from './analyzers/shared-state-analyzer.js';
export { TimingAnalyzer } from './analyzers/timing-analyzer.js';
export { LockAnalyzer } from './analyzers/lock-analyzer.js';

// Patterns
export { PatternMatcher } from './patterns/pattern-matcher.js';
export { 
  PatternRegistry, 
  defaultRegistry 
} from './patterns/pattern-registry.js';

/**
 * @deprecated Use RaceDetectionStrategy (PascalCase) from './RaceDetectionStrategy.js'
 * This export is maintained for backward compatibility
 */
export { RaceDetectionStrategy as RaceDetectionStrategyCompat } from './RaceDetectionStrategy.js';
