/**
 * @fileoverview Temporal Connections Module
 * 
 * Modular architecture for temporal connection extraction.
 * 
 * Architecture:
 * - Detectors: Strategy pattern for different temporal types
 * - Analyzers: Analysis and optimization recommendations
 * - TemporalConnectionExtractor: Main orchestrator
 * 
 * @module layer-a-static/extractors/metadata/temporal-connections
 */

// Main Extractor
export { TemporalConnectionExtractor } from './TemporalConnectionExtractor.js';
export { TemporalConnectionExtractor as default } from './TemporalConnectionExtractor.js';

// Detectors (Strategy Pattern)
export { detectTimeouts } from './detectors/timeout-detector.js';
export { detectIntervals } from './detectors/interval-detector.js';
export { detectPromises } from './detectors/promise-detector.js';
export { detectEvents } from './detectors/event-detector.js';

// Detector defaults for strategy pattern
export { default as timeoutDetector } from './detectors/timeout-detector.js';
export { default as intervalDetector } from './detectors/interval-detector.js';
export { default as promiseDetector } from './detectors/promise-detector.js';
export { default as eventDetector } from './detectors/event-detector.js';

// Analyzers
export { 
  analyzeDelay, 
  categorizeDelay, 
  determineImpact, 
  getRecommendations,
  analyzeDelayPatterns,
  DelayThresholds,
  DelayImpact 
} from './analyzers/delay-analyzer.js';

export { 
  analyzeAsyncFlow, 
  analyzePromiseAll, 
  analyzePromiseRace,
  analyzeSequentialAwaits,
  analyzePromiseChain,
  detectRaceConditions,
  RiskLevel 
} from './analyzers/async-flow-analyzer.js';

// Legacy API (backward compatible)
// These maintain the original function signatures

import { TemporalConnectionExtractor } from './TemporalConnectionExtractor.js';

const defaultExtractor = new TemporalConnectionExtractor();

/**
 * Extracts temporal patterns from code (legacy API)
 * @param {string} code - Source code
 * @param {Object} functionInfo - Function metadata
 * @returns {Object} Temporal patterns
 */
export function extractTemporalPatterns(code, functionInfo) {
  return defaultExtractor.extractPatterns(code, functionInfo);
}

/**
 * Extracts temporal connections between atoms (legacy API)
 * @param {Array} atoms - Function atoms
 * @returns {Array} Temporal connections
 */
export function extractTemporalConnections(atoms) {
  return defaultExtractor.extractConnections(atoms);
}

/**
 * Extracts cross-file temporal connections (legacy API)
 * @param {Array} allAtoms - All project atoms
 * @returns {Array} Cross-file connections
 */
export function extractCrossFileTemporalConnections(allAtoms) {
  return defaultExtractor.extractCrossFileConnections(allAtoms);
}
