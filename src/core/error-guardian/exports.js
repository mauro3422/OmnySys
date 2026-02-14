/**
 * @fileoverview exports.js
 * 
 * Re-exports from handlers and strategies for advanced usage.
 * Centralized export point for all error-guardian components.
 * 
 * @module core/error-guardian/exports
 */

// Handlers
export { ErrorClassifier, SEVERITY, ERROR_PATTERNS } from './handlers/error-classifier.js';
export { RecoveryHandler, RECOVERY_ACTIONS } from './handlers/recovery-handler.js';

// Strategies
export { RetryStrategy, RETRY_CONFIG } from './strategies/retry-strategy.js';
export { FallbackStrategy, FALLBACK_LEVELS } from './strategies/fallback-strategy.js';
export { CircuitBreaker, CIRCUIT_STATE, CIRCUIT_CONFIG } from './strategies/circuit-breaker.js';
