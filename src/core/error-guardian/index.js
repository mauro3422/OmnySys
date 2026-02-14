/**
 * @fileoverview index.js
 * 
 * Public API for error-guardian module.
 * Centralized entry point for all error-guardian functionality.
 * 
 * @module core/error-guardian
 */

import { ErrorGuardian } from './guardian/index.js';

// Singleton instance
let guardianInstance = null;

/**
 * Get the singleton ErrorGuardian instance
 * @returns {ErrorGuardian} The singleton instance
 */
export function getErrorGuardian() {
  if (!guardianInstance) {
    guardianInstance = new ErrorGuardian();
  }
  return guardianInstance;
}

/**
 * Set a custom ErrorGuardian instance (for testing or custom configuration)
 * @param {ErrorGuardian} instance - The instance to set
 */
export function setErrorGuardian(instance) {
  guardianInstance = instance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetErrorGuardian() {
  guardianInstance = null;
}

// Main class
export { ErrorGuardian, default } from './guardian/index.js';

// Component re-exports for advanced usage
export {
  ErrorClassifier,
  SEVERITY,
  ERROR_PATTERNS,
  RecoveryHandler,
  RECOVERY_ACTIONS,
  RetryStrategy,
  RETRY_CONFIG,
  FallbackStrategy,
  FALLBACK_LEVELS,
  CircuitBreaker,
  CIRCUIT_STATE,
  CIRCUIT_CONFIG
} from './exports.js';
