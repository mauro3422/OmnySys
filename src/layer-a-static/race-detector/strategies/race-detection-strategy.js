/**
 * @fileoverview race-detection-strategy.js
 * 
 * ⚠️  DEPRECATED: This file is kept for backward compatibility.
 * 
 * The race detection strategy module has been refactored into a modular architecture:
 * 
 *   race-detection-strategy/
 *   ├── analyzers/
 *   │   ├── shared-state-analyzer.js
 *   │   ├── timing-analyzer.js
 *   │   └── lock-analyzer.js
 *   ├── patterns/
 *   │   ├── pattern-matcher.js
 *   │   └── pattern-registry.js
 *   ├── RaceDetectionStrategy.js
 *   └── index.js
 * 
 * Please update your imports:
 * 
 *   // Old (deprecated)
 *   import { RaceDetectionStrategy } from './race-detection-strategy.js';
 * 
 *   // New (recommended)
 *   import { RaceDetectionStrategy } from './race-detection-strategy/index.js';
 *   // or
 *   import { RaceDetectionStrategy } from './race-detection-strategy/RaceDetectionStrategy.js';
 * 
 * @module race-detector/strategies/race-detection-strategy
 * @deprecated Use the modular structure in ./race-detection-strategy/
 */

// Re-export everything from the new modular structure
export {
  // Core class
  RaceDetectionStrategy,
  RaceDetectionStrategy as default,
  // Analyzers
  SharedStateAnalyzer,
  TimingAnalyzer,
  LockAnalyzer,
  // Patterns
  PatternMatcher,
  PatternRegistry,
  defaultRegistry
} from './race-detection-strategy/index.js';

// Log deprecation warning in development
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
  console.warn(
    '[DEPRECATED] race-detection-strategy.js is deprecated. ' +
    'Use race-detection-strategy/index.js instead.'
  );
}
