/**
 * @fileoverview Race Detector Closure Analysis - Index
 * 
 * Closure analysis utilities for detecting captured variables
 * that might cause race conditions.
 * 
 * @module race-detector/closure-analysis
 * @version 1.0.0
 */

export {
  extractDeclarations,
  extractReferences,
  extractAsyncCallbackVars,
  extractScopeInfo
} from './variable-extractor.js';

export {
  findCapturedVariables,
  calculateCaptureRisk
} from './capture-detector.js';
