/**
 * @fileoverview Temporal Connections Extractor (Legacy Compatibility)
 * 
 * ⚠️ DEPRECATED: This file is a compatibility wrapper.
 * Please import from 'temporal-connections/' module directly.
 * 
 * Migration guide:
 * - import { extractTemporalPatterns } from './temporal-connections.js'
 * + import { extractTemporalPatterns } from './temporal-connections/index.js'
 * 
 * Or use the new class-based API:
 * + import { TemporalConnectionExtractor } from './temporal-connections/index.js'
 * 
 * @module layer-a-static/extractors/metadata/temporal-connections
 * @deprecated Use temporal-connections/index.js instead
 */

// Re-export everything from the new modular structure
export {
  // Main extractor
  TemporalConnectionExtractor,
  // Legacy functions (maintain 100% backward compatibility)
  extractTemporalPatterns,
  extractTemporalConnections,
  extractCrossFileTemporalConnections,
  // Detectors (for extensibility)
  detectTimeouts,
  detectIntervals,
  detectPromises,
  detectEvents,
  timeoutDetector,
  intervalDetector,
  promiseDetector,
  eventDetector,
  // Analyzers (for advanced usage)
  analyzeDelay,
  analyzeAsyncFlow,
  analyzeDelayPatterns,
  categorizeDelay,
  determineImpact,
  getRecommendations,
  analyzePromiseAll,
  analyzePromiseRace,
  analyzeSequentialAwaits,
  analyzePromiseChain,
  detectRaceConditions,
  // Constants
  DelayThresholds,
  DelayImpact,
  RiskLevel
} from './temporal-connections/index.js';

// Default export for compatibility
export { TemporalConnectionExtractor as default } from './temporal-connections/index.js';
