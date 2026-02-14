/**
 * @fileoverview error-guardian.js
 * 
 * ⚠️  LEGACY FILE - Maintained for backward compatibility
 * 
 * This file re-exports all functionality from the modular error-guardian/
 * directory. New code should import directly from 'error-guardian/' module.
 * 
 * Before: import { ErrorGuardian, getErrorGuardian } from './error-guardian.js';
 * After:  import { ErrorGuardian, getErrorGuardian } from './error-guardian/index.js';
 * 
 * @deprecated Use modular imports from './error-guardian/' instead
 * @module core/error-guardian-legacy
 */

// Re-export everything from the modular structure
export {
  // Main class
  ErrorGuardian,
  
  // Singleton management
  getErrorGuardian,
  setErrorGuardian,
  resetErrorGuardian,
  
  // Strategies
  RetryStrategy,
  RETRY_CONFIG,
  FallbackStrategy,
  FALLBACK_LEVELS,
  CircuitBreaker,
  CIRCUIT_STATE,
  CIRCUIT_CONFIG,
  
  // Handlers
  ErrorClassifier,
  ERROR_PATTERNS,
  SEVERITY,
  RecoveryHandler,
  RECOVERY_ACTIONS
} from './error-guardian/index.js';

// Default export
export { ErrorGuardian as default } from './error-guardian/index.js';

// Log deprecation warning in development
import { createLogger } from '../utils/logger.js';
const logger = createLogger('OmnySys:error:guardian');

if (process.env.NODE_ENV === 'development') {
  logger.debug('⚠️  Using deprecated error-guardian.js import. Consider migrating to modular imports from error-guardian/');
}
