/**
 * @fileoverview ErrorGuardian.js
 * 
 * Main Error Guardian Class
 * 
 * Guardián de Errores - Sistema de autoprotección recursiva
 * 
 * Captura TODO error en el sistema MCP y:
 * 1. Lo registra con contexto completo
 * 2. Analiza el tipo de error
 * 3. Propone soluciones automáticas
 * 4. Previene que el sistema crashee
 * 
 * Siguiendo Recursividad: El sistema se protege a sí mismo
 * 
 * @module core/error-guardian/guardian/ErrorGuardian
 */

import { createLogger } from '../../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

// Import modular components
import { ErrorClassifier, SEVERITY } from '../handlers/error-classifier.js';
import { RecoveryHandler } from '../handlers/recovery-handler.js';
import { RetryStrategy } from '../strategies/retry-strategy.js';
import { FallbackStrategy } from '../strategies/fallback-strategy.js';
import { CircuitBreaker, CIRCUIT_STATE } from '../strategies/circuit-breaker.js';

const logger = createLogger('OmnySys:error:guardian');

/**
 * Clase ErrorGuardian - Sistema de protección recursiva
 */
export class ErrorGuardian {
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.options = {
      enableGlobalHandlers: true,
      enableCircuitBreaker: true,
      enableRetry: true,
      enableFallback: true,
      ...options
    };

    // Initialize modular components
    this.classifier = new ErrorClassifier();
    this.recovery = new RecoveryHandler(projectPath);
    this.retry = new RetryStrategy();
    this.fallback = new FallbackStrategy();
    this.circuitBreaker = new CircuitBreaker();

    // State
    this.errorLog = [];
    this.stats = {
      totalErrors: 0,
      byType: {},
      bySeverity: {},
      autoFixed: 0,
      prevented: 0
    };

    if (this.options.enableGlobalHandlers) {
      this.setupGlobalHandlers();
    }
  }

  /**
   * Configura handlers globales para capturar TODO error
   */
  setupGlobalHandlers() {
    // Capturar errores no manejados
    process.on('uncaughtException', (error) => {
      this.handleFatalError(error, 'uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.handleFatalError(reason, 'unhandledRejection', { promise });
    });

    // Capturar warnings
    process.on('warning', (warning) => {
      this.handleWarning(warning);
    });

    logger.info('🛡️  Error Guardian activado - Sistema protegido recursivamente');
  }

  /**
   * Analiza un error y determina su tipo y severidad
   * @param {Error} error - Error to analyze
   * @returns {Object} - Classification result
   */
  analyzeError(error) {
    return this.classifier.classify(error);
  }

  /**
   * Execute an operation with all protective strategies
   * @param {string} operationId - Operation identifier
   * @param {Function} operation - Operation to execute
   * @param {Object} options - Execution options
   * @returns {Promise<*>} - Operation result
   */
  async execute(operationId, operation, options = {}) {
    const {
      useCircuitBreaker = this.options.enableCircuitBreaker,
      useRetry = this.options.enableRetry,
      useFallback = this.options.enableFallback,
      fallbackValue
    } = options;

    let wrappedOperation = operation;

    // Wrap with retry if enabled
    if (useRetry) {
      const originalOp = wrappedOperation;
      wrappedOperation = async () => {
        return this.retry.execute(originalOp, { 
          operationId, 
          errorType: options.errorType || 'UNKNOWN'
        });
      };
    }

    // Wrap with fallback if enabled
    if (useFallback && fallbackValue !== undefined) {
      const originalOp = wrappedOperation;
      wrappedOperation = async () => {
        try {
          return await originalOp();
        } catch (error) {
          logger.warn(`⚠️  Operation ${operationId} failed, using fallback`);
          return fallbackValue;
        }
      };
    }

    // Wrap with circuit breaker if enabled
    if (useCircuitBreaker) {
      return this.circuitBreaker.execute(operationId, wrappedOperation);
    }

    return wrappedOperation();
  }

  /**
   * Maneja un error fatal del sistema
   * @param {Error} error - Error object
   * @param {string} source - Error source
   * @param {Object} context - Additional context
   */
  async handleFatalError(error, source, context = {}) {
    const analysis = this.analyzeError(error);

    // LOW severity errors (like EPIPE) - just log quietly, no banner
    if (this.classifier.isQuietError(analysis)) {
      logger.info(`ℹ️  ${analysis.type}: ${error.message || 'Unknown'} (${source}) - auto-handled`);
      await this.logError({
        timestamp: new Date().toISOString(),
        type: analysis.type,
        severity: analysis.severity,
        source,
        message: error.message,
        suggestion: analysis.suggestion,
        context
      });
      this.stats.prevented++;
      return;
    }

    logger.error('═══════════════════════════════════════════════════');
    logger.error('🚨 ERROR FATAL CAPTURADO POR GUARDIÁN');
    logger.error('═══════════════════════════════════════════════════');
    logger.error(`Tipo: ${analysis.type}`);
    logger.error(`Severidad: ${analysis.severity}`);
    logger.error(`Fuente: ${source}`);
    logger.error(`Mensaje: ${error.message || 'Sin mensaje'}`);
    logger.error(`Sugerencia: ${analysis.suggestion}`);
    logger.error('───────────────────────────────────────────────────');

    if (analysis.commonFixes.length > 0) {
      logger.error('💡 Soluciones posibles:');
      analysis.commonFixes.forEach((fix, i) => {
        logger.error(`   ${i + 1}. ${fix}`);
      });
    }

    logger.error('═══════════════════════════════════════════════════');

    // Guardar en log
    await this.logError({
      timestamp: new Date().toISOString(),
      type: analysis.type,
      severity: analysis.severity,
      source,
      message: error.message,
      stack: error.stack,
      suggestion: analysis.suggestion,
      context
    });

    // Intentar auto-fix si es posible
    if (analysis.autoFixable) {
      logger.info('🔧 Intentando auto-fix...');
      const fixed = await this.recovery.attemptAutoFix(analysis);
      if (fixed) {
        logger.info('✅ Auto-fix exitoso. Sistema estabilizado.');
        this.stats.autoFixed++;
        return;
      }
    }

    // Si no se pudo arreglar, intentar recuperación graceful
    await this.recovery.recover(analysis);
    this.stats.prevented++;
  }

  /**
   * Loguea un error con contexto completo
   * @param {Object} errorData - Error data to log
   */
  async logError(errorData) {
    this.errorLog.push(errorData);
    this.stats.totalErrors++;

    // Actualizar estadísticas
    this.stats.byType[errorData.type] = (this.stats.byType[errorData.type] || 0) + 1;
    this.stats.bySeverity[errorData.severity] = (this.stats.bySeverity[errorData.severity] || 0) + 1;

    // Guardar en archivo
    const logPath = path.join(this.projectPath, 'logs', 'error-guardian.json');
    try {
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.writeFile(logPath, JSON.stringify({
        lastUpdated: new Date().toISOString(),
        stats: this.stats,
        recentErrors: this.errorLog.slice(-50) // Últimos 50
      }, null, 2));
    } catch (e) {
      // Si no podemos loguear, al menos lo tenemos en memoria
    }
  }

  /**
   * Maneja warnings (errores no fatales)
   * @param {Error} warning - Warning object
   */
  handleWarning(warning) {
    logger.warn('⚠️  Warning detectado:', warning.message);
    // Los warnings no detienen el sistema, solo los registramos
  }

  /**
   * Obtiene estadísticas de errores
   * @returns {Object} - Complete statistics
   */
  getStats() {
    return {
      ...this.stats,
      recentErrors: this.errorLog.slice(-10),
      health: this.calculateHealth(),
      classification: this.classifier.getStats(),
      recovery: this.recovery.getStats(),
      circuits: this.circuitBreaker.getAllStates()
    };
  }

  /**
   * Calcula salud del sistema
   * @returns {string} - Health status
   */
  calculateHealth() {
    const criticalCount = this.stats.bySeverity.CRITICAL || 0;
    const highCount = this.stats.bySeverity.HIGH || 0;

    if (criticalCount > 5) return 'CRITICAL';
    if (criticalCount > 0 || highCount > 10) return 'WARNING';
    if (highCount > 0) return 'DEGRADED';
    return 'HEALTHY';
  }

  /**
   * Get circuit breaker state for an operation
   * @param {string} operationId - Operation identifier
   * @returns {Object}
   */
  getCircuitState(operationId) {
    return this.circuitBreaker.getState(operationId);
  }

  /**
   * Register a fallback chain
   * @param {string} operationId - Operation identifier
   * @param {Object} fallbackChain - Fallback configuration
   */
  registerFallback(operationId, fallbackChain) {
    this.fallback.register(operationId, fallbackChain);
  }

  /**
   * Add custom error pattern
   * @param {string} type - Pattern type
   * @param {Object} config - Pattern configuration
   */
  addErrorPattern(type, config) {
    this.classifier.addPattern(type, config);
  }

  /**
   * Register recovery callback
   * @param {string} severity - Severity level
   * @param {Function} callback - Callback function
   */
  registerRecoveryCallback(severity, callback) {
    this.recovery.registerCallback(severity, callback);
  }

  /**
   * Clear all error logs and stats
   */
  async clear() {
    this.errorLog = [];
    this.stats = {
      totalErrors: 0,
      byType: {},
      bySeverity: {},
      autoFixed: 0,
      prevented: 0
    };
    this.classifier.clearHistory();
    this.recovery.resetStats();
    this.circuitBreaker.resetAll();
    this.retry.clearAttempts();
    this.fallback.clear();

    const logPath = path.join(this.projectPath, 'logs', 'error-guardian.json');
    try {
      await fs.unlink(logPath);
    } catch (e) {
      // File might not exist
    }
  }
}

export default ErrorGuardian;
