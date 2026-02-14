/**
 * @fileoverview exports.js
 * 
 * Re-exports from handlers and strategies for advanced usage.
 * Centralized export point for all error-guardian components.
 * 
 * @module core/error-guardian/exports
 */

// Handlers
export { ErrorClassifier, SEVERITY } from './handlers/error-classifier.js';
export { RecoveryHandler } from './handlers/recovery-handler.js';

// Strategies
export { RetryStrategy } from './strategies/retry-strategy.js';
export { FallbackStrategy } from './strategies/fallback-strategy.js';
export { CircuitBreaker, CIRCUIT_STATE } from './strategies/circuit-breaker.js';
