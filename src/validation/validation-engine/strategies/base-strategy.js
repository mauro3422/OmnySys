/**
 * @fileoverview Base Strategy - Interfaz base para estrategias de validación
 * 
 * Define el contrato que todas las estrategias de validación deben implementar.
 * Sigue el principio de Inversión de Dependencias (DIP).
 * 
 * @module validation-engine/strategies/base-strategy
 */

/**
 * Clase base abstracta para estrategias de validación
 * @abstract
 */
export class BaseValidationStrategy {
  /**
   * @param {string} name - Nombre identificador de la estrategia
   * @param {string} layer - Capa de validación (source, derivation, semantic, cross-metadata)
   */
  constructor(name, layer) {
    if (new.target === BaseValidationStrategy) {
      throw new Error('Cannot instantiate abstract class directly');
    }
    this.name = name;
    this.layer = layer;
  }

  /**
   * Ejecuta la validación según la estrategia
   * @abstract
   * @param {ValidationContext} context - Contexto de validación
   * @param {RuleRegistry} registry - Registro de reglas
   * @param {Map} cache - Caché de resultados
   * @returns {Promise<ValidationResult[]>} Array de resultados
   */
  async execute(context, registry, cache) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Verifica si esta estrategia puede manejar la entidad dada
   * @param {object} entity - Entidad a validar
   * @returns {boolean} true si puede validar la entidad
   */
  canValidate(entity) {
    return true;
  }
}

export default { BaseValidationStrategy };
