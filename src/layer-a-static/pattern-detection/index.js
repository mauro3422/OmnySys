/**
 * @fileoverview index.js
 * 
 * Main entry point for pattern-detection module.
 * 
 * @module pattern-detection
 */

// Engine
export { PatternDetectionEngine } from './engine/PatternDetectionEngine.js';
export { PatternDetectorRegistry } from './engine/PatternDetectorRegistry.js';
export { QualityScoreAggregator } from './engine/QualityScoreAggregator.js';
export { ConfigManager } from './engine/ConfigManager.js';
export { DEFAULT_CONFIG } from './engine/DefaultConfig.js';

// Runners
export { DetectorRunner } from './runners/DetectorRunner.js';

// Re-export PatternDetector base class (from detector-base.js if exists)
export { PatternDetector } from './detector-base.js';

// Default export
export { PatternDetectionEngine as default } from './engine/PatternDetectionEngine.js';
