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

function createGuardianOptions(options = {}) {
  return {
    enableGlobalHandlers: true,
    enableCircuitBreaker: true,
    enableRetry: true,
    enableFallback: true,
    enableAutoFix: false,
    ...options
  };
}

function createGuardianComponents(projectPath) {
  return {
    classifier: new ErrorClassifier(),
    recovery: new RecoveryHandler(projectPath),
    retry: new RetryStrategy(),
    fallback: new FallbackStrategy(),
    circuitBreaker: new CircuitBreaker()
  };
}

function createGuardianUtilities(projectPath, errorLog, stats, options, retry, fallback, circuitBreaker) {
  return {
    logError: createErrorLogger(projectPath, errorLog, stats),
    execute: createExecutionWrapper(
      { retry, fallback, circuitBreaker },
      options
    )
  };
}

function buildGuardianStats(stats, classifier, recovery, circuitBreaker, errorLog) {
  return aggregateStats(stats, {
    classifier,
    recovery,
    circuitBreaker,
    errorLog,
    health: calculateHealth(stats)
  });
}

/**
 * ErrorGuardian - Sistema de protección recursiva
 */
export class ErrorGuardian {
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.options = createGuardianOptions(options);

    // Safety warning
    if (this.options.enableAutoFix) {
      logger.warn('⚠️  Auto-fix is ENABLED. This may overwrite your code changes.');
      logger.warn('   Make sure you have committed your changes to git before continuing.');
    }

    // Initialize components
    const components = createGuardianComponents(projectPath);
    this.classifier = components.classifier;
    this.recovery = components.recovery;
    this.retry = components.retry;
    this.fallback = components.fallback;
    this.circuitBreaker = components.circuitBreaker;

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
    const utilities = createGuardianUtilities(
      projectPath,
      this.errorLog,
      this.stats,
      this.options,
      this.retry,
      this.fallback,
      this.circuitBreaker
    );
    this.logError = utilities.logError;
    this.execute = utilities.execute;
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

  getStats() {
    return this.getErrorGuardianStats();
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

