/**
 * @fileoverview index.js
 * 
 * Main entry point for RaceDetectionStrategy module.
 * Re-exports all public APIs for backward compatibility.
 * 
 * @module race-detector/strategies/race-detection-strategy
 */

// Strategy
export { RaceDetectionStrategy } from './strategy/RaceDetectionStrategy.js';
export { RaceFactory } from './strategy/RaceFactory.js';
export { PatternRegistry, defaultRegistry } from './strategy/PatternRegistry.js';

// Detectors
export { SharedStateAnalyzer } from './detectors/SharedStateAnalyzer.js';
export { TimingAnalyzer } from './detectors/TimingAnalyzer.js';
export { LockAnalyzer } from './detectors/LockAnalyzer.js';
export { PatternMatcher } from './detectors/PatternMatcher.js';

// Default export
export { RaceDetectionStrategy as default } from './strategy/RaceDetectionStrategy.js';
