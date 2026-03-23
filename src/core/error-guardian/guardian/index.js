/**
 * @fileoverview ErrorGuardian - Main Entry Point (Refactored)
 *
 * Sistema de autoprotección recursiva - Ahora modular
 *
 * @module error-guardian/guardian
 */

import { handleFatalError } from './handlers/fatal-error-handler.js';
import { handleWarning, setupGlobalHandlers } from './handlers/global-handler.js';
import {
  bindGuardianActions,
  buildGuardianStats,
  clearGuardianErrorLog,
  initializeGuardianState,
  resetGuardianState
} from './guardian-helpers.js';

/**
 * ErrorGuardian - Sistema de protección recursiva
 */
export class ErrorGuardian {
  constructor(projectPath, options = {}) {
    initializeGuardianState(this, projectPath, options);
    bindGuardianActions(this, handleWarning);
  }

  /**
   * Create fatal error handler with dependencies
   */
  _createFatalHandler() {
    return (error, source, context = {}) => {
      const analysis = this.classifier.classify(error);
      return handleFatalError(error, analysis, source, context, {
        recovery: this.recovery,
        options: this.options,
        logError: this.logError,
        stats: this.stats
      });
    };
  }

  setupGlobalHandlers() {
    setupGlobalHandlers(this._fatalHandler, this._warningHandler);
  }

  analyzeError(error) {
    return this.classifier.classify(error);
  }

  getErrorGuardianStats() {
    return buildGuardianStats(
      this.stats,
      this.classifier,
      this.recovery,
      this.circuitBreaker,
      this.errorLog
    );
  }

  getCircuitState(operationId) {
    return this.circuitBreaker.getState(operationId);
  }

  registerFallback(operationId, fallbackChain) {
    this.fallback.register(operationId, fallbackChain);
  }

  addErrorPattern(type, config) {
    this.classifier.addPattern(type, config);
  }

  registerRecoveryCallback(severity, callback) {
    this.recovery.registerCallback(severity, callback);
  }

  async resetGuardianState() {
    resetGuardianState(this);
    await clearGuardianErrorLog(this.projectPath);
  }
}

export default ErrorGuardian;
