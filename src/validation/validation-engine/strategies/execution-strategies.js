/**
 * @fileoverview Execution Strategies - Estrategias de ejecución del engine
 * 
 * Separa la lógica de ejecución del ValidationEngine.
 * 
 * @module validation-engine/strategies/execution-strategies
 */

import { createLogger } from '../../../utils/logger.js';
import { SequentialRunner } from '../runners/sequential-runner.js';

const logger = createLogger('OmnySys:validation:execution');

/**
 * Ejecuta estrategias con manejo de early-stop para secuencial
 * @param {BaseValidationStrategy[]} strategies
 * @param {ValidationContext} context
 * @param {RuleRegistry} registry
 * @param {Map} cache
 * @param {boolean} stopOnCritical
 * @returns {Promise<ValidationResult[]>}
 */
export async function executeWithEarlyStop(strategies, context, registry, cache, stopOnCritical) {
  const sequentialRunner = new SequentialRunner({ maxConcurrency: 10 });
  
  const { results, stopped } = await sequentialRunner.runWithEarlyStop(
    strategies,
    context,
    registry,
    cache,
    (results) => stopOnCritical && results.some(r => r.severity === 'critical')
  );
  
  if (stopped) {
    logger.error('CRITICAL INVARIANTS VIOLATED - STOPPING');
  }
  
  return results;
}

/**
 * Procesa auto-fix para resultados
 * @param {ValidationResult[]} results
 * @param {ValidationContext} context
 * @param {RuleRegistry} registry
 */
export async function processAutoFix(results, context, registry) {
  for (const result of results) {
    if (!result.valid && result.fixable && result.entity) {
      const rule = registry.get(result.rule);
      if (rule?.fix) {
        const entity = context.getEntity(result.entity);
        if (entity) {
          const fixed = await rule.fix(entity, context, result);
          if (fixed !== null) {
            result.markFixed(fixed);
          }
        }
      }
    }
  }
}

export default { executeWithEarlyStop, processAutoFix };
