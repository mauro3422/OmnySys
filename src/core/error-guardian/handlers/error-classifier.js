/**
 * @fileoverview error-classifier.js
 * 
 * Error Classification System
 * 
 * Analyzes errors and determines their type, severity, and
 * potential solutions based on pattern matching.
 * 
 * @module core/error-guardian/handlers/error-classifier
 * @deprecated Use modular version: error-classifier/index.js
 */

// Re-export from modular version for backward compatibility
export { 
  SEVERITY, 
  ERROR_PATTERNS, 
  ErrorClassifier 
} from './error-classifier/index.js';

export { default } from './error-classifier/index.js';
