/**
 * @fileoverview engine.js
 * 
 * Backward compatibility wrapper.
 * Use './index.js' for new code.
 * 
 * @deprecated Use './index.js' instead
 * @module pattern-detection/engine
 */

export {
  PatternDetectionEngine,
  PatternDetectionEngine as default,
  PatternDetectorRegistry,
  QualityScoreAggregator,
  ConfigManager,
  DEFAULT_CONFIG
} from './index.js';
