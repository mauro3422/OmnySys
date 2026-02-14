/**
 * @fileoverview ErrorGuardian.js
 * 
 * @deprecated Use ./guardian/index.js or ./index.js directly
 * This file is kept for backward compatibility and will be removed in a future version.
 * 
 * Migration:
 * - Import ErrorGuardian: import { ErrorGuardian } from './guardian/index.js' or './index.js'
 * - Import components: import { ErrorClassifier, SEVERITY, ... } from './exports.js' or './index.js'
 * 
 * @module core/error-guardian/ErrorGuardian
 */

// Re-export from new locations for backward compatibility
export { ErrorGuardian, default } from './guardian/ErrorGuardian.js';
export {
  ErrorClassifier,
  SEVERITY,
  RecoveryHandler,
  RetryStrategy,
  FallbackStrategy,
  CircuitBreaker,
  CIRCUIT_STATE
} from './exports.js';
