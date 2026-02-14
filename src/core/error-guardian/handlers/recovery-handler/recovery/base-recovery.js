/**
 * @fileoverview Base Recovery Handler
 * 
 * Core recovery mechanisms and state management.
 * 
 * @module core/error-guardian/handlers/recovery-handler/recovery/base-recovery
 */

import { createLogger } from '../../../../utils/logger.js';

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
    this.projectPath = projectPath;
    this.stats = {
      totalRecoveries: 0,
      bySeverity: {},
      byAction: {},
      failedRecoveries: 0
    };
    this.recoveryCallbacks = new Map();
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
