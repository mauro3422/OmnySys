/**
 * @fileoverview Base Recovery Handler
 * 
 * Core recovery mechanisms and state management.
 * 
 * @module core/error-guardian/handlers/recovery-handler/recovery/base-recovery
 */

import { createLogger } from '../../../../utils/logger.js';
import { 
  handleCritical, 
  handleHigh, 
  handleMedium, 
  handleLow, 
  handleUnknown 
} from '../strategies/severity-handlers.js';
import { attemptAutoFix } from '../actions/auto-fix.js';
import { saveSystemState } from '../actions/state-manager.js';
import { registerCallback, executeCallback } from '../utils/callbacks.js';
import { getRecoveryStats, resetStats } from '../utils/stats.js';

const logger = createLogger('OmnySys:error:recovery');

/**
 * Recovery severity actions
 */
export const RECOVERY_ACTIONS = {
  CRITICAL: 'restart_essential',
  HIGH: 'isolate_component',
  MEDIUM: 'continue_with_caution',
  LOW: 'log_quietly'
};

/**
 * Recovery Handler
 */
export class RecoveryHandler {
  constructor(projectPath) {
    this.projectPath = typeof projectPath === 'string' && projectPath.trim()
      ? projectPath
      : process.cwd();
    this.stats = {
      totalRecoveries: 0,
      bySeverity: {},
      byAction: {},
      failedRecoveries: 0
    };
    this.recoveryCallbacks = new Map();
  }

  /**
   * Get recovery statistics
   * @returns {Object} - Statistics
   */
  getRecoveryStats() {
    return getRecoveryStats(this.stats);
  }

  /**
   * Reset recovery statistics
   */
  resetStats() {
    this.stats = resetStats();
  }

  handleCritical(analysis) {
    return handleCritical(this, analysis);
  }

  handleHigh(analysis) {
    return handleHigh(this, analysis);
  }

  handleMedium(analysis) {
    return handleMedium(this, analysis);
  }

  handleLow(analysis) {
    return handleLow(this, analysis);
  }

  handleUnknown(analysis) {
    return handleUnknown(this, analysis);
  }

  attemptAutoFix(analysis) {
    return attemptAutoFix(analysis, this.projectPath, this.stats);
  }

  saveSystemState() {
    return saveSystemState(this.projectPath, this.stats);
  }

  registerCallback(severity, callback) {
    registerCallback(this.recoveryCallbacks, severity, callback);
  }

  executeCallback(severity, analysis) {
    return executeCallback(this.recoveryCallbacks, severity, analysis);
  }

  /**
   * Execute recovery based on error classification
   * @param {Object} analysis - Error classification from ErrorClassifier
   * @returns {Promise<boolean>} - Whether recovery succeeded
   */
  async recover(analysis) {
    const { severity, type } = analysis;

    logger.info(`🔄 Iniciando recuperación para error tipo ${type} (severidad: ${severity})`);

    try {
      // Guardar estado antes de recuperación
      await this.saveSystemState();

      let result;
      switch (severity) {
        case 'CRITICAL':
          result = await this.handleCritical(analysis);
          break;
        case 'HIGH':
          result = await this.handleHigh(analysis);
          break;
        case 'MEDIUM':
          result = await this.handleMedium(analysis);
          break;
        case 'LOW':
          result = await this.handleLow(analysis);
          break;
        default:
          result = await this.handleUnknown(analysis);
      }

      if (result) {
        this.stats.totalRecoveries++;
        this.stats.bySeverity[severity] = (this.stats.bySeverity[severity] || 0) + 1;
        logger.info('✅ Recuperación graceful completada. Sistema sigue operativo.');
      }

      return result;
    } catch (recoveryError) {
      this.stats.failedRecoveries++;
      logger.error('💀 Recuperación falló. Esto es grave:', recoveryError.message);
      return false;
    }
  }
}

export default RecoveryHandler;
