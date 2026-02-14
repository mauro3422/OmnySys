/**
 * @fileoverview Shared Objects Detector - Main Entry Point
 * 
 * @module shared-objects-detector
 */

export { SharedObjectsDetector } from './detector.js';
export { analyzeRiskProfile } from './analyzers/risk-analyzer.js';
export { countUsages } from './analyzers/usage-counter.js';
export { generateRecommendation, calculateScore } from './analyzers/recommendation-generator.js';
export { isConfigObject, isStateObject, isUtilsObject } from './patterns/name-patterns.js';

export { default } from './detector.js';
