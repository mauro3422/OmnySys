/**
 * @fileoverview ValidationRule - Clase base para reglas de validación
 * @module validation/core/rules/ValidationRule
 */

import { ValidationResult, ValidationSeverity } from '../results/index.js';

/**
 * Clase base para todas las reglas de validación
 */
export class ValidationRule {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description || '';
    this.layer = config.layer || 'source';
    this.invariant = config.invariant || false;
    this.fixable = config.fixable || false;
    this.appliesTo = config.appliesTo || [];
    this.requires = config.requires || [];
    this.validateFn = config.validate;
    this.fixFn = config.fix;
  }

  /**
   * Verifica si esta regla aplica a una entidad
   */
  appliesToEntity(entity) {
    const entityType = entity.type || 'unknown';
    return this.appliesTo.includes(entityType);
  }

  /**
   * Verifica si tenemos todos los campos requeridos
   */
  hasRequiredFields(entity, context) {
    for (const field of this.requires) {
      const value = this.getFieldValue(entity, context, field);
      if (value === undefined || value === null) {
        return false;
      }
    }
    return true;
  }

  /**
   * Obtiene el valor de un campo (soporta notación punto)
   */
  getFieldValue(entity, context, field) {
    if (field in entity) {
      return entity[field];
    }

    const parts = field.split('.');
    let value = entity;
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }

    if (value === undefined && context) {
      value = context[field];
    }

    return value;
  }

  /**
   * Ejecuta la validación
   */
  async validate(entity, context) {
    const startTime = Date.now();

    try {
      const result = await this.validateFn(entity, context, this);

      if (typeof result === 'boolean') {
        return result
          ? ValidationResult.valid(entity.id, null, {
              rule: this.id,
              layer: this.layer,
              duration: Date.now() - startTime
            })
          : ValidationResult.invalid(
              entity.id,
              null,
              'expected condition',
              'condition not met',
              {
                rule: this.id,
                layer: this.layer,
                severity: this.invariant ? ValidationSeverity.CRITICAL : ValidationSeverity.ERROR,
                duration: Date.now() - startTime
              }
            );
      }

      if (result instanceof ValidationResult) {
        result.rule = this.id;
        result.layer = this.layer;
        result.duration = Date.now() - startTime;
        return result;
      }

      return new ValidationResult({
        entity: entity.id,
        valid: result.valid ?? true,
        message: result.message,
        expected: result.expected,
        actual: result.actual,
        severity: result.severity || (this.invariant ? ValidationSeverity.CRITICAL : ValidationSeverity.ERROR),
        details: result.details,
        rule: this.id,
        layer: this.layer,
        duration: Date.now() - startTime,
        fixable: this.fixable && !result.valid
      });

    } catch (error) {
      return ValidationResult.critical(
        entity.id,
        null,
        'validation to complete',
        `error: ${error.message}`,
        {
          rule: this.id,
          layer: this.layer,
          details: { stack: error.stack },
          duration: Date.now() - startTime
        }
      );
    }
  }

  /**
   * Intenta fixear el problema
   */
  async fix(entity, context, validationResult) {
    if (!this.fixable || !this.fixFn) {
      return null;
    }

    try {
      return await this.fixFn(entity, context, validationResult);
    } catch (error) {
      return null;
    }
  }
}
