/**
 * @fileoverview ErrorGuardian - Main Entry Point (Refactored)
 * 
 * Sistema de autoprotección recursiva - Ahora modular
 * 
 * @module error-guardian/guardian
 */

import { createLogger } from '../../utils/logger.js';

// Handlers
import { handleFatalError } from './handlers/fatal-error-handler.js';
import { setupGlobalHandlers, handleWarning } from './handlers/global-handler.js';

// Health
import { calculateHealth } from './health/health-calculator.js';

// Logging
import { createErrorLogger, clearErrorLog } from './logging/error-logger.js';

// Execution
import { createExecutionWrapper } from './execution/execution-wrapper.js';

// State
import { createInitialStats, resetStats, aggregateStats } from './state/stats-manager.js';

// External components
import { ErrorClassifier } from '../handlers/error-classifier/index.js';
import { RecoveryHandler } from '../handlers/recovery-handler/index.js';
import { RetryStrategy } from '../strategies/retry-strategy.js';
import { FallbackStrategy } from '../strategies/fallback-strategy.js';
import { CircuitBreaker } from '../strategies/circuit-breaker.js';

const logger = createLogger('OmnySys:error:guardian');

/**
 * ErrorGuardian - Sistema de protección recursiva
 */
export class ErrorGuardian {
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.options = {
      enableGlobalHandlers: true,
      enableCircuitBreaker: true,
      enableRetry: true,
      enableFallback: true,
      enableAutoFix: false,
      ...options
    };

    // Safety warning
    if (this.options.enableAutoFix) {
      logger.warn('⚠️  Auto-fix is ENABLED. This may overwrite your code changes.');
      logger.warn('   Make sure you have committed your changes to git before continuing.');
    }

    // Initialize components
    this.classifier = new ErrorClassifier();
    this.recovery = new RecoveryHandler(projectPath);
    this.retry = new RetryStrategy();
    this.fallback = new FallbackStrategy();
    this.circuitBreaker = new CircuitBreaker();

    // State
    this.errorLog = [];
    this.stats = createInitialStats();

    // Create bound handlers
    this._fatalHandler = this._createFatalHandler();
    this._warningHandler = handleWarning;

    // Setup global handlers
    if (this.options.enableGlobalHandlers) {
      this.setupGlobalHandlers();
    }

    // Create utilities
    this.logError = createErrorLogger(projectPath, this.errorLog, this.stats);
    this.execute = createExecutionWrapper(
      { retry: this.retry, fallback: this.fallback, circuitBreaker: this.circuitBreaker },
      this.options
    );
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

  getStats() {
    return aggregateStats(this.stats, {
      classifier: this.classifier,
      recovery: this.recovery,
      circuitBreaker: this.circuitBreaker,
      errorLog: this.errorLog,
      health: calculateHealth(this.stats)
    });
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

  async clear() {
    this.errorLog = [];
    resetStats(this.stats);
    this.classifier.clearHistory();
    this.recovery.resetStats();
    this.circuitBreaker.resetAll();
    this.retry.clearAttempts();
    this.fallback.clear();
    await clearErrorLog(this.projectPath);
  }
}

export default ErrorGuardian;
