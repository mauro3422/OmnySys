/**
 * @fileoverview index.js
 * 
 * Public API for error-guardian module.
 * Centralized entry point for all error-guardian functionality.
 * 
 * @module core/error-guardian
 */

// Main class
export { ErrorGuardian, default } from './guardian/index.js';

// Component re-exports for advanced usage
export {
  ErrorClassifier,
  SEVERITY,
  RecoveryHandler,
  RetryStrategy,
  FallbackStrategy,
  CircuitBreaker,
  CIRCUIT_STATE
} from './exports.js';
