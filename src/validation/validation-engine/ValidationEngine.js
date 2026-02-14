/**
 * @fileoverview ValidationEngine - Motor de validación modular
 * 
 * @module validation-engine/ValidationEngine
 */

import { createLogger } from '../../utils/logger.js';
import { ValidationContext } from './context.js';
import { ReportBuilder } from './reports/index.js';
import { initializeStrategies, initializeRunner } from './engine-helpers.js';
import { executeWithEarlyStop, processAutoFix } from './strategies/execution-strategies.js';
import { SequentialRunner } from './runners/index.js';

const logger = createLogger('OmnySys:validation:engine');

const DEFAULT_OPTIONS = {
  parallel: true,
  maxConcurrency: 10,
  autoFix: false,
  incremental: false,
  cacheResults: true,
  stopOnCritical: true,
  enabledStrategies: ['syntax', 'schema', 'semantic']
};

/**
 * Motor de validación principal
 */
export class ValidationEngine {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.registry = options.registry;
    this.context = null;
    this.cache = new Map();
    this.strategies = initializeStrategies(this.options.enabledStrategies);
    this.runner = initializeRunner(this.options);
    this.reportBuilder = new ReportBuilder();
  }

  async validate(projectPath, omnysysPath) {
    const startTime = Date.now();
    this.logStart(projectPath);

    this.context = new ValidationContext(projectPath, omnysysPath);
    await this.context.load();
    this.reportBuilder.reset();

    try {
      const results = await this.executeStrategies();
      if (this.options.autoFix) await processAutoFix(results, this.context, this.registry);
      this.reportBuilder.addResults(results);
    } catch (error) {
      logger.error('Validation failed:', error);
      this.reportBuilder.addError(error);
    }

    const report = this.reportBuilder.build();
    this.logComplete(report, Date.now() - startTime);
    return report;
  }

  async executeStrategies() {
    const strategies = Array.from(this.strategies.values());
    if (strategies.length === 0) {
      logger.warn('No validation strategies configured');
      return [];
    }

    if (!this.options.parallel && this.options.stopOnCritical) {
      return executeWithEarlyStop(strategies, this.context, this.registry, this.cache, true);
    }

    const { results } = await this.runner.run(strategies, this.context, this.registry, this.cache);
    return results;
  }

  async validateSingle(entityId) {
    if (!this.context) throw new Error('Context not initialized');
    const entity = this.context.getEntity(entityId);
    if (!entity) throw new Error(`Entity not found: ${entityId}`);

    const results = [];
    for (const strategy of this.strategies.values()) {
      if (strategy.canValidate(entity)) {
        const strategyResults = await strategy.execute(this.context, this.registry, this.cache);
        results.push(...strategyResults.filter(r => r.entity === entityId));
      }
    }
    return results;
  }

  registerStrategy(name, strategy) {
    this.strategies.set(name, strategy);
    logger.info(`Registered strategy: ${name}`);
  }

  setRunner(runner) {
    this.runner = runner;
    logger.info(`Set runner to: ${runner.name}`);
  }

  clearCache() {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      strategies: Array.from(this.strategies.keys()),
      runner: this.runner?.name,
      options: this.options
    };
  }

  logStart(projectPath) {
    logger.info('='.repeat(70));
    logger.info('STARTING VALIDATION');
    logger.info(`Project: ${projectPath}`);
    logger.info(`Options: ${JSON.stringify(this.options)}`);
  }

  logComplete(report, duration) {
    logger.info('='.repeat(70));
    logger.info('VALIDATION COMPLETE');
    logger.info(`Duration: ${duration}ms`);
    logger.info(`Results: ${report.stats.passed} passed, ${report.stats.failed} failed, ${report.stats.critical} critical`);
    logger.info('='.repeat(70));
  }
}

export default { ValidationEngine };
