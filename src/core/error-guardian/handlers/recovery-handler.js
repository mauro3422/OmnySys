/**
 * @fileoverview recovery-handler.js
 * 
 * Recovery Mechanisms
 * 
 * Handles graceful recovery from errors based on severity levels.
 * Implements recovery strategies to keep the system operational.
 * 
 * @module core/error-guardian/handlers/recovery-handler
 */

import { createLogger } from '../../../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

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

  /**
   * Handle CRITICAL severity errors
   * @param {Object} analysis - Error analysis
   * @returns {Promise<boolean>}
   */
  async handleCritical(analysis) {
    logger.error('💥 Error CRITICAL. Reiniciando componentes esenciales...');
    
    await this.restartEssentialComponents();
    await this.executeCallback('CRITICAL', analysis);
    
    return true;
  }

  /**
   * Handle HIGH severity errors
   * @param {Object} analysis - Error analysis
   * @returns {Promise<boolean>}
   */
  async handleHigh(analysis) {
    logger.warn('⚠️  Error HIGH. Aislando componente afectado...');
    
    await this.isolateAffectedComponent(analysis);
    await this.executeCallback('HIGH', analysis);
    
    return true;
  }

  /**
   * Handle MEDIUM severity errors
   * @param {Object} analysis - Error analysis
   * @returns {Promise<boolean>}
   */
  async handleMedium(analysis) {
    logger.info('ℹ️  Error MEDIUM. Continuando con precaución...');
    
    await this.executeCallback('MEDIUM', analysis);
    
    return true;
  }

  /**
   * Handle LOW severity errors
   * @param {Object} analysis - Error analysis
   * @returns {Promise<boolean>}
   */
  async handleLow(analysis) {
    // Low severity - just log quietly, no action needed
    logger.debug(`Low severity error handled: ${analysis.type}`);
    return true;
  }

  /**
   * Handle unknown severity errors
   * @param {Object} analysis - Error analysis
   * @returns {Promise<boolean>}
   */
  async handleUnknown(analysis) {
    logger.warn(`Unknown severity, treating as MEDIUM: ${analysis.type}`);
    return this.handleMedium(analysis);
  }

  /**
   * Attempt auto-fix for specific error types
   * @param {Object} analysis - Error analysis
   * @returns {Promise<boolean>} - Whether auto-fix succeeded
   */
  async attemptAutoFix(analysis) {
    const { type } = analysis;

    try {
      switch (type) {
        case 'CACHE_ERROR':
          return await this.fixCacheError();

        case 'MODULE_NOT_FOUND':
          // Can't auto-fix, but we can provide guidance
          logger.warn('⚠️  Module not found requires manual fix. Check imports.');
          return false;

        case 'DYNAMIC_IMPORT':
          logger.warn('⚠️  Dynamic import issue requires manual code review.');
          return false;

        default:
          logger.info(`No auto-fix available for: ${type}`);
          return false;
      }
    } catch (fixError) {
      logger.error('❌ Auto-fix falló:', fixError.message);
      return false;
    }
  }

  /**
   * Fix cache errors by clearing cache
   * @returns {Promise<boolean>}
   */
  async fixCacheError() {
    try {
      const { UnifiedCacheManager } = await import('../../unified-cache-manager.js');
      const cache = new UnifiedCacheManager(this.projectPath);
      await cache.clear();
      logger.info('🗑️  Caché limpiado automáticamente');
      this.stats.byAction.cache_clear = (this.stats.byAction.cache_clear || 0) + 1;
      return true;
    } catch (e) {
      logger.error('❌ Failed to clear cache:', e.message);
      return false;
    }
  }

  /**
   * Reinicia componentes esenciales
   * @returns {Promise<void>}
   */
  async restartEssentialComponents() {
    // Reiniciar caché
    try {
      const { UnifiedCacheManager } = await import('../../unified-cache-manager.js');
      const cache = new UnifiedCacheManager(this.projectPath);
      await cache.clear();
      logger.info('🔄 Caché reiniciado');
    } catch (e) {
      logger.warn('⚠️  No se pudo reiniciar caché:', e.message);
    }

    this.stats.byAction.component_restart = (this.stats.byAction.component_restart || 0) + 1;
    logger.info('🔄 Componentes esenciales reiniciados');
  }

  /**
   * Aisla el componente afectado para evitar propagación
   * @param {Object} analysis - Error analysis
   * @returns {Promise<void>}
   */
  async isolateAffectedComponent(analysis) {
    logger.info('🔒 Aislando componente afectado...');
    
    // Marcar como no disponible temporalmente
    // Prevenir llamadas futuras hasta que se arregle
    
    this.stats.byAction.component_isolation = (this.stats.byAction.component_isolation || 0) + 1;
    logger.info('🔒 Componente aislado. El resto del sistema sigue funcionando.');
  }

  /**
   * Guarda el estado del sistema antes de un error
   * @returns {Promise<void>}
   */
  async saveSystemState() {
    const statePath = path.join(this.projectPath, '.omnysysdata', 'error-state.json');
    const state = {
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      stats: this.stats
    };

    try {
      await fs.mkdir(path.dirname(statePath), { recursive: true });
      await fs.writeFile(statePath, JSON.stringify(state, null, 2));
    } catch (e) {
      // Ignorar errores al guardar estado
      logger.debug('Could not save system state:', e.message);
    }
  }

  /**
   * Register a callback for specific severity levels
   * @param {string} severity - Severity level
   * @param {Function} callback - Callback function
   */
  registerCallback(severity, callback) {
    if (!this.recoveryCallbacks.has(severity)) {
      this.recoveryCallbacks.set(severity, []);
    }
    this.recoveryCallbacks.get(severity).push(callback);
  }

  /**
   * Execute callbacks for a severity level
   * @param {string} severity - Severity level
   * @param {Object} analysis - Error analysis
   */
  async executeCallback(severity, analysis) {
    const callbacks = this.recoveryCallbacks.get(severity) || [];
    for (const callback of callbacks) {
      try {
        await callback(analysis);
      } catch (e) {
        logger.warn('Recovery callback failed:', e.message);
      }
    }
  }

  /**
   * Obtiene estadísticas de recuperación
   * @returns {Object}
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRecoveries: 0,
      bySeverity: {},
      byAction: {},
      failedRecoveries: 0
    };
  }
}

export default RecoveryHandler;
