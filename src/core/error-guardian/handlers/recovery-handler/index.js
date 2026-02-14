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
import { getStats, resetStats } from './utils/stats.js';

// Attach methods to RecoveryHandler prototype
RecoveryHandler.prototype.handleCritical = function(analysis) {
  return handleCritical(this, analysis);
};

RecoveryHandler.prototype.handleHigh = function(analysis) {
  return handleHigh(this, analysis);
};

RecoveryHandler.prototype.handleMedium = function(analysis) {
  return handleMedium(this, analysis);
};

RecoveryHandler.prototype.handleLow = function(analysis) {
  return handleLow(this, analysis);
};

RecoveryHandler.prototype.handleUnknown = function(analysis) {
  return handleUnknown(this, analysis);
};

RecoveryHandler.prototype.attemptAutoFix = function(analysis) {
  return attemptAutoFix(analysis, this.projectPath, this.stats);
};

RecoveryHandler.prototype.saveSystemState = function() {
  return saveSystemState(this.projectPath, this.stats);
};

RecoveryHandler.prototype.registerCallback = function(severity, callback) {
  registerCallback(this.recoveryCallbacks, severity, callback);
};

RecoveryHandler.prototype.executeCallback = function(severity, analysis) {
  return executeCallback(this.recoveryCallbacks, severity, analysis);
};

RecoveryHandler.prototype.getStats = function() {
  return getStats(this.stats);
};

RecoveryHandler.prototype.resetStats = function() {
  this.stats = resetStats();
};

export { RecoveryHandler, RECOVERY_ACTIONS };
export default RecoveryHandler;
