/**
 * @fileoverview Parallel Runner - Ejecutor paralelo de validaciones
 * 
 * Ejecuta las estrategias de validación en paralelo para mejor rendimiento.
 * Útil cuando las validaciones son independientes entre sí.
 * 
 * @module validation-engine/runners/parallel-runner
 */

import { createLogger } from '../../../utils/logger.js';
import { BaseValidationRunner } from './base-runner.js';

const logger = createLogger('OmnySys:validation:runner:parallel');

/**
 * Ejecutor paralelo de estrategias de validación
 */
export class ParallelRunner extends BaseValidationRunner {
  constructor(options = {}) {
    super(options);
    this.name = 'parallel';
  }

  /**
   * Ejecuta estrategias en paralelo con límite de concurrencia
   * @param {BaseValidationStrategy[]} strategies - Estrategias a ejecutar
   * @param {ValidationContext} context - Contexto de validación
   * @param {RuleRegistry} registry - Registro de reglas
   * @param {Map} cache - Caché de resultados
   * @returns {Promise<{results: ValidationResult[], duration: number}>}
   */
  async run(strategies, context, registry, cache) {
    const startTime = Date.now();
    
    logger.info(`Running ${strategies.length} strategies in parallel (max ${this.options.maxConcurrency})`);

    // Ejecutar todas en paralelo usando Promise.all
    // El orden no importa en ejecución paralela
    const promises = strategies.map(strategy => 
      this.executeWithTiming(strategy, context, registry, cache)
    );

    const results = await Promise.all(promises);
    const allResults = results.flat();

    const duration = Date.now() - startTime;
    logger.info(`Parallel execution completed in ${duration}ms`);

    return { results: allResults, duration };
  }

  /**
   * Ejecuta una estrategia con logging de tiempo
   * @private
   */
  async executeWithTiming(strategy, context, registry, cache) {
    const strategyStart = Date.now();
    
    try {
      const results = await strategy.execute(context, registry, cache);
      const strategyDuration = Date.now() - strategyStart;
      
      logger.info(`  Strategy ${strategy.name} completed in ${strategyDuration}ms`);
      
      // Agregar duración a cada resultado
      return results.map(r => {
        r.duration = (r.duration || 0) + strategyDuration;
        return r;
      });
    } catch (error) {
      logger.error(`  Strategy ${strategy.name} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ejecuta estrategias en batches para controlar concurrencia
   * @param {BaseValidationStrategy[]} strategies
   * @param {ValidationContext} context
   * @param {RuleRegistry} registry
   * @param {Map} cache
   * @returns {Promise<{results: ValidationResult[], duration: number}>}
   */
  async runBatched(strategies, context, registry, cache) {
    const startTime = Date.now();
    const allResults = [];
    
    const { maxConcurrency } = this.options;
    logger.info(`Running ${strategies.length} strategies in batches of ${maxConcurrency}`);

    // Procesar en batches
    for (let i = 0; i < strategies.length; i += maxConcurrency) {
      const batch = strategies.slice(i, i + maxConcurrency);
      logger.info(`  Processing batch ${Math.floor(i / maxConcurrency) + 1}/${Math.ceil(strategies.length / maxConcurrency)}`);
      
      const promises = batch.map(strategy => 
        this.executeStrategy(strategy, context, registry, cache)
      );
      
      const batchResults = await Promise.all(promises);
      allResults.push(...batchResults.flat());
    }

    const duration = Date.now() - startTime;
    logger.info(`Batched execution completed in ${duration}ms`);

    return { results: allResults, duration };
  }
}

export default { ParallelRunner };
