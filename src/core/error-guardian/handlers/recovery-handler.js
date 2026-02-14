/**
 * @fileoverview recovery-handler.js
 * 
 * Recovery Mechanisms
 * 
 * Handles graceful recovery from errors based on severity levels.
 * Implements recovery strategies to keep the system operational.
 * 
 * @module core/error-guardian/handlers/recovery-handler
 * @deprecated Use modular version: recovery-handler/index.js
 */

// Re-export from modular version for backward compatibility
export { 
  RecoveryHandler, 
  RECOVERY_ACTIONS,
  default
} from './recovery-handler/index.js';
