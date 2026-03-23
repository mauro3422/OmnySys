/**
 * @fileoverview ErrorGuardian helpers
 */

import { createLogger } from '../../utils/logger.js';
import { calculateHealth } from './health/health-calculator.js';
import { createErrorLogger, clearErrorLog } from './logging/error-logger.js';
import { createExecutionWrapper } from './execution/execution-wrapper.js';
import { createInitialStats, resetStats, aggregateStats } from './state/stats-manager.js';
import { handleWarning } from './handlers/global-handler.js';
import { ErrorClassifier } from '../handlers/error-classifier/index.js';
import { RecoveryHandler } from '../handlers/recovery-handler/index.js';
import { RetryStrategy } from '../strategies/retry-strategy.js';
import { FallbackStrategy } from '../strategies/fallback-strategy.js';
import { CircuitBreaker } from '../strategies/circuit-breaker.js';

const logger = createLogger('OmnySys:error:guardian');

export function createGuardianOptions(options = {}) {
  return {
    enableGlobalHandlers: true,
    enableCircuitBreaker: true,
    enableRetry: true,
    enableFallback: true,
    enableAutoFix: false,
    ...options
  };
}

export function createGuardianComponents(projectPath) {
  return {
    classifier: new ErrorClassifier(),
    recovery: new RecoveryHandler(projectPath),
    retry: new RetryStrategy(),
    fallback: new FallbackStrategy(),
    circuitBreaker: new CircuitBreaker()
  };
}

export function createGuardianUtilities(projectPath, errorLog, stats, options, retry, fallback, circuitBreaker) {
  return {
    logError: createErrorLogger(projectPath, errorLog, stats),
    execute: createExecutionWrapper(
      { retry, fallback, circuitBreaker },
      options
    )
  };
}

export function buildGuardianStats(stats, classifier, recovery, circuitBreaker, errorLog) {
  return aggregateStats(stats, {
    classifier,
    recovery,
    circuitBreaker,
    errorLog,
    health: calculateHealth(stats)
  });
}

export function initializeGuardianState(instance, projectPath, options) {
  instance.projectPath = projectPath;
  instance.options = createGuardianOptions(options);

  if (instance.options.enableAutoFix) {
    logger.warn('⚠️  Auto-fix is ENABLED. This may overwrite your code changes.');
    logger.warn('   Make sure you have committed your changes to git before continuing.');
  }

  const components = createGuardianComponents(projectPath);
  instance.classifier = components.classifier;
  instance.recovery = components.recovery;
  instance.retry = components.retry;
  instance.fallback = components.fallback;
  instance.circuitBreaker = components.circuitBreaker;

  instance.errorLog = [];
  instance.stats = createInitialStats();
  instance._warningHandler = null;
}

export function bindGuardianActions(instance, warningHandler) {
  instance._warningHandler = warningHandler || handleWarning;
  instance._fatalHandler = instance._createFatalHandler();

  if (instance.options.enableGlobalHandlers) {
    instance.setupGlobalHandlers();
  }

  const utilities = createGuardianUtilities(
    instance.projectPath,
    instance.errorLog,
    instance.stats,
    instance.options,
    instance.retry,
    instance.fallback,
    instance.circuitBreaker
  );

  instance.logError = utilities.logError;
  instance.execute = utilities.execute;
}

export function resetGuardianState(instance) {
  instance.errorLog = [];
  resetStats(instance.stats);
  instance.classifier.clearHistory();
  instance.recovery.resetStats();
  instance.circuitBreaker.resetAll();
  instance.retry.clearAttempts();
  instance.fallback.clear();
}

export async function clearGuardianErrorLog(projectPath) {
  await clearErrorLog(projectPath);
}
