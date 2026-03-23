/**
 * @fileoverview recovery-handler/index.js
 * 
 * Recovery Mechanisms
 * 
 * Handles graceful recovery from errors based on severity levels.
 * Implements recovery strategies to keep the system operational.
 * 
 * @module core/error-guardian/handlers/recovery-handler
 */

import { RecoveryHandler, RECOVERY_ACTIONS } from './recovery/base-recovery.js';
import { 
  handleCritical, 
  handleHigh, 
  handleMedium, 
  handleLow, 
  handleUnknown 
} from './strategies/severity-handlers.js';
import { attemptAutoFix } from './actions/auto-fix.js';
import { saveSystemState } from './actions/state-manager.js';
import { registerCallback, executeCallback } from './utils/callbacks.js';
// Methods now integrated in the base class via base-recovery.js

export { RecoveryHandler, RECOVERY_ACTIONS };
export default RecoveryHandler;
