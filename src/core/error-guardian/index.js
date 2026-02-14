/**
 * @fileoverview index.js
 * 
 * Error Guardian Module - Entry Point
 * 
 * Modular error handling system providing:
 * - Error classification and analysis
 * - Recovery mechanisms
 * - Retry strategies with exponential backoff
 * - Fallback chains for graceful degradation
 * - Circuit breaker pattern for cascade failure prevention
 * 
 * @module core/error-guardian
 */

// Main class
export { ErrorGuardian } from './ErrorGuardian.js';

// Strategies
export { RetryStrategy, RETRY_CONFIG } from './strategies/retry-strategy.js';
export { FallbackStrategy, FALLBACK_LEVELS } from './strategies/fallback-strategy.js';
export { CircuitBreaker, CIRCUIT_STATE, CIRCUIT_CONFIG } from './strategies/circuit-breaker.js';

// Handlers
export { ErrorClassifier, ERROR_PATTERNS, SEVERITY } from './handlers/error-classifier.js';
export { RecoveryHandler, RECOVERY_ACTIONS } from './handlers/recovery-handler.js';

// Backward compatibility: singleton instance management
let guardianInstance = null;

/**
 * Get or create the singleton ErrorGuardian instance
 * @param {string} projectPath - Project root path
 * @param {Object} options - Configuration options
 * @returns {ErrorGuardian} - Singleton instance
 */
export function getErrorGuardian(projectPath, options = {}) {
  if (!guardianInstance && projectPath) {
    const { ErrorGuardian } = require('./ErrorGuardian.js');
    guardianInstance = new ErrorGuardian(projectPath, options);
  }
  return guardianInstance;
}

/**
 * Set a custom ErrorGuardian instance (for testing or custom configuration)
 * @param {ErrorGuardian} instance - Custom instance
 */
export function setErrorGuardian(instance) {
  guardianInstance = instance;
}

/**
 * Reset the singleton instance
 */
export function resetErrorGuardian() {
  guardianInstance = null;
}

// Default export for convenience
import { ErrorGuardian } from './ErrorGuardian.js';
export default ErrorGuardian;
