/**
 * @fileoverview Base Validator
 * 
 * Interfaz base para todos los validadores.
 * 
 * @module ground-truth-validator/validators/base-validator
 * @version 1.0.0
 */

/**
 * Clase base para validadores
 * @abstract
 */
export class BaseValidator {
  constructor(name) {
    this.name = name;
  }

  /**
   * Ejecuta la validación
   * @param {ValidationContext} context - Contexto de validación
   * @returns {Promise<ValidationResult>}
   */
  async validate(context) {
    throw new Error('Must implement validate()');
  }

  /**
   * Verifica si este validador puede ejecutarse
   * @param {ValidationContext} context - Contexto
   * @returns {boolean}
   */
  canValidate(context) {
    return true;
  }
}

export default { BaseValidator };
