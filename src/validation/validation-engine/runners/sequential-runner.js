/**
 * @fileoverview Sequential Runner - Ejecutor secuencial de validaciones
 * 
 * Ejecuta las estrategias de validación una tras otra.
 * Útil cuando el orden importa o hay dependencias entre fases.
 * 
 * @module validation-engine/runners/sequential-runner
 */

import { createLogger } from '../../../utils/logger.js';
import { BaseValidationRunner } from './base-runner.js';

const logger = createLogger('OmnySys:validation:runner:sequential');

/**
 * Ejecutor secuencial de estrategias de validación
 */
export class SequentialRunner extends BaseValidationRunner {
  constructor(options = {}) {
    super(options);
    this.name = 'sequential';
  }

  /**
   * Ejecuta estrategias secuencialmente en orden
   * @param {BaseValidationStrategy[]} strategies - Estrategias a ejecutar
   * @param {ValidationContext} context - Contexto de validación
   * @param {RuleRegistry} registry - Registro de reglas
   * @param {Map} cache - Caché de resultados
   * @returns {Promise<{results: ValidationResult[], duration: number}>}
   */
  async run(strategies, context, registry, cache) {
    const startTime = Date.now();
    const allResults = [];
    
    logger.info(`Running ${strategies.length} strategies sequentially`);

    for (const strategy of strategies) {
      logger.info(`  Executing strategy: ${strategy.name}`);
      const strategyStart = Date.now();
      
      const results = await this.executeStrategy(strategy, context, registry, cache);
      allResults.push(...results);
      
      const strategyDuration = Date.now() - strategyStart;
      logger.info(`  Strategy ${strategy.name} completed in ${strategyDuration}ms`);
    }

    const duration = Date.now() - startTime;
    logger.info(`Sequential execution completed in ${duration}ms`);

    return { results: allResults, duration };
  }

  /**
   * Ejecuta estrategias con posibilidad de detenerse ante errores críticos
   * @param {BaseValidationStrategy[]} strategies 
   * @param {ValidationContext} context
   * @param {RuleRegistry} registry
   * @param {Map} cache
   * @param {Function} shouldStop - Función que determina si detener (recibe resultados)
   * @returns {Promise<{results: ValidationResult[], duration: number, stopped: boolean}>}
   */
  async runWithEarlyStop(strategies, context, registry, cache, shouldStop) {
    const startTime = Date.now();
    const allResults = [];
    
    for (const strategy of strategies) {
      const results = await this.executeStrategy(strategy, context, registry, cache);
      allResults.push(...results);
      
      if (shouldStop && shouldStop(results)) {
        const duration = Date.now() - startTime;
        logger.warn(`Execution stopped early after ${strategy.name}`);
        return { results: allResults, duration, stopped: true };
      }
    }

    return { 
      results: allResults, 
      duration: Date.now() - startTime, 
      stopped: false 
    };
  }
}

export default { SequentialRunner };
