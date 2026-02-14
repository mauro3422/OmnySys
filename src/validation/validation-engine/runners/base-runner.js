/**
 * @fileoverview Base Runner - Interfaz base para ejecutores de validación
 * 
 * Define el contrato que todos los ejecutores deben implementar.
 * SRP: Responsable solo de la ejecución de estrategias.
 * 
 * @module validation-engine/runners/base-runner
 */

/**
 * Clase base abstracta para ejecutores de validación
 * @abstract
 */
export class BaseValidationRunner {
  /**
   * @param {object} options - Opciones de ejecución
   * @param {number} options.maxConcurrency - Máximo de operaciones concurrentes
   */
  constructor(options = {}) {
    if (new.target === BaseValidationRunner) {
      throw new Error('Cannot instantiate abstract class directly');
    }
    this.options = {
      maxConcurrency: options.maxConcurrency ?? 10,
      ...options
    };
  }

  /**
   * Ejecuta una o más estrategias de validación
   * @abstract
   * @param {BaseValidationStrategy[]} strategies - Estrategias a ejecutar
   * @param {ValidationContext} context - Contexto de validación
   * @param {RuleRegistry} registry - Registro de reglas
   * @param {Map} cache - Caché de resultados
   * @returns {Promise<{results: ValidationResult[], duration: number}>}
   */
  async run(strategies, context, registry, cache) {
    throw new Error('run() must be implemented by subclass');
  }

  /**
   * Ejecuta una sola estrategia
   * @protected
   * @param {BaseValidationStrategy} strategy 
   * @param {ValidationContext} context
   * @param {RuleRegistry} registry
   * @param {Map} cache
   * @returns {Promise<ValidationResult[]>}
   */
  async executeStrategy(strategy, context, registry, cache) {
    const startTime = Date.now();
    try {
      const results = await strategy.execute(context, registry, cache);
      return results.map(r => {
        r.duration = Date.now() - startTime;
        return r;
      });
    } catch (error) {
      return [{
        valid: false,
        entity: strategy.name,
        message: `Strategy execution failed: ${error.message}`,
        severity: 'error',
        duration: Date.now() - startTime
      }];
    }
  }
}

export default { BaseValidationRunner };
