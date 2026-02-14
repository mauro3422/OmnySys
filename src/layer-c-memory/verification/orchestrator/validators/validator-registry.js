/**
 * @fileoverview Validator Registry - Registro de validadores
 * 
 * Responsabilidad Única (SRP): Registrar y gestionar validadores disponibles.
 * 
 * @module verification/orchestrator/validators
 */

import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:verification:validators');

/**
 * Registro de validadores
 */
export class ValidatorRegistry {
  constructor() {
    this.validators = new Map();
  }

  /**
   * Registra un validador
   * @param {string} name - Nombre del validador
   * @param {Function} validatorClass - Clase del validador
   */
  register(name, validatorClass) {
    this.validators.set(name, validatorClass);
    logger.debug(`Registered validator: ${name}`);
  }

  /**
   * Obtiene un validador por nombre
   * @param {string} name - Nombre del validador
   * @returns {Function|undefined} Clase del validador
   */
  get(name) {
    return this.validators.get(name);
  }

  /**
   * Crea instancias de validadores según configuración
   * @param {Object} options - Opciones de configuración
   * @param {string} projectPath - Path del proyecto
   * @returns {Array} Instancias de validadores
   */
  createValidators(options, projectPath) {
    const instances = [];
    
    for (const [name, ValidatorClass] of this.validators) {
      if (options[name] !== false) {
        instances.push(new ValidatorClass(projectPath));
        logger.debug(`Created validator instance: ${name}`);
      }
    }
    
    return instances;
  }

  /**
   * Lista todos los validadores registrados
   * @returns {Array<string>} Nombres de validadores
   */
  listValidators() {
    return Array.from(this.validators.keys());
  }

  /**
   * Verifica si un validador está registrado
   * @param {string} name - Nombre del validador
   * @returns {boolean} true si está registrado
   */
  has(name) {
    return this.validators.has(name);
  }
}

// Instancia global del registro
export const globalValidatorRegistry = new ValidatorRegistry();

/**
 * Registra validadores estándar
 * @param {ValidatorRegistry} registry - Registro donde registrar
 */
export function registerStandardValidators(registry) {
  // Los validadores se registran dinámicamente para evitar dependencias circulares
  // Se espera que el usuario llame a esto después de importar los validadores
}
