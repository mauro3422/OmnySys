/**
 * @fileoverview Rule Registry - Registro de reglas de validación
 * 
 * Implementa un registro declarativo donde cada regla declara:
 * - Qué entidades aplica (átomos, moléculas, etc.)
 * - Qué campos requiere
 * - Cómo validar
 * - Si es auto-fixeable
 * 
 * Siguiendo Open/Closed: Nuevas reglas sin modificar código existente.
 * 
 * @module validation/core/rule-registry
 */

import { ValidationResult, ValidationSeverity } from './validation-result.js';

/**
 * Clase base para todas las reglas de validación
 */
export class ValidationRule {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description || '';
    this.layer = config.layer || 'source'; // source, derivation, semantic, cross-metadata
    this.invariant = config.invariant || false; // Si true, nunca debe fallar
    this.fixable = config.fixable || false;
    
    // Qué entidades aplica esta regla
    this.appliesTo = config.appliesTo || []; // ['atom', 'molecule', 'module']
    
    // Qué campos requiere para funcionar
    this.requires = config.requires || []; // ['complexity', 'calls', 'exports']
    
    // Función de validación
    this.validateFn = config.validate;
    
    // Función de fix (opcional)
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
    // Primero buscar en la entidad
    if (field in entity) {
      return entity[field];
    }
    
    // Luego buscar con notación punto (e.g., 'dataFlow.inputs')
    const parts = field.split('.');
    let value = entity;
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    
    // Si no se encontró, buscar en el contexto
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
      
      // Si el resultado es booleano, convertir a ValidationResult
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
      
      // Si ya es ValidationResult, solo agregar metadata
      if (result instanceof ValidationResult) {
        result.rule = this.id;
        result.layer = this.layer;
        result.duration = Date.now() - startTime;
        return result;
      }
      
      // Si es un objeto, crear ValidationResult
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
      const fixedValue = await this.fixFn(entity, context, validationResult);
      return fixedValue;
    } catch (error) {
      return null;
    }
  }
}

/**
 * Registro de reglas de validación
 * 
 * Singleton que mantiene todas las reglas registradas.
 * Soporta auto-discovery de reglas en directorios.
 */
export class RuleRegistry {
  constructor() {
    this.rules = new Map();
    this.rulesByLayer = {
      source: [],
      derivation: [],
      semantic: [],
      'cross-metadata': []
    };
    this.rulesByEntity = new Map();
    this.invariants = [];
  }

  /**
   * Registra una nueva regla
   */
  register(rule) {
    if (!(rule instanceof ValidationRule)) {
      rule = new ValidationRule(rule);
    }
    
    // Verificar ID único
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule with id '${rule.id}' already registered`);
    }
    
    this.rules.set(rule.id, rule);
    
    // Indexar por capa
    if (this.rulesByLayer[rule.layer]) {
      this.rulesByLayer[rule.layer].push(rule);
    }
    
    // Indexar por tipo de entidad
    for (const entityType of rule.appliesTo) {
      if (!this.rulesByEntity.has(entityType)) {
        this.rulesByEntity.set(entityType, []);
      }
      this.rulesByEntity.get(entityType).push(rule);
    }
    
    // Trackear invariantes
    if (rule.invariant) {
      this.invariants.push(rule);
    }
    
    return this;
  }

  /**
   * Registra múltiples reglas
   */
  registerMany(rules) {
    rules.forEach(r => this.register(r));
    return this;
  }

  /**
   * Obtiene una regla por ID
   */
  get(id) {
    return this.rules.get(id);
  }

  /**
   * Obtiene todas las reglas para una capa
   */
  getByLayer(layer) {
    return this.rulesByLayer[layer] || [];
  }

  /**
   * Obtiene todas las reglas para un tipo de entidad
   */
  getByEntityType(entityType) {
    return this.rulesByEntity.get(entityType) || [];
  }

  /**
   * Obtiene todas las invariantes
   */
  getInvariants() {
    return this.invariants;
  }

  /**
   * Encuentra reglas aplicables a una entidad específica
   */
  findApplicable(entity, context = {}) {
    const entityType = entity.type || 'unknown';
    const rules = this.getByEntityType(entityType);
    
    return rules.filter(rule => {
      // Verificar que tenga todos los campos requeridos
      return rule.hasRequiredFields(entity, context);
    });
  }

  /**
   * Lista todas las reglas registradas
   */
  list() {
    return Array.from(this.rules.values());
  }

  /**
   * Verifica si una regla existe
   */
  has(id) {
    return this.rules.has(id);
  }

  /**
   * Elimina una regla
   */
  unregister(id) {
    const rule = this.rules.get(id);
    if (!rule) return false;
    
    this.rules.delete(id);
    
    // Remover de índices
    const layerRules = this.rulesByLayer[rule.layer];
    if (layerRules) {
      const idx = layerRules.indexOf(rule);
      if (idx > -1) layerRules.splice(idx, 1);
    }
    
    for (const entityType of rule.appliesTo) {
      const entityRules = this.rulesByEntity.get(entityType);
      if (entityRules) {
        const idx = entityRules.indexOf(rule);
        if (idx > -1) entityRules.splice(idx, 1);
      }
    }
    
    if (rule.invariant) {
      const idx = this.invariants.indexOf(rule);
      if (idx > -1) this.invariants.splice(idx, 1);
    }
    
    return true;
  }

  /**
   * Obtiene estadísticas del registro
   */
  getStats() {
    return {
      total: this.rules.size,
      byLayer: {
        source: this.rulesByLayer.source.length,
        derivation: this.rulesByLayer.derivation.length,
        semantic: this.rulesByLayer.semantic.length,
        'cross-metadata': this.rulesByLayer['cross-metadata'].length
      },
      invariants: this.invariants.length,
      byEntity: Object.fromEntries(
        Array.from(this.rulesByEntity.entries()).map(([k, v]) => [k, v.length])
      )
    };
  }

  /**
   * Limpia todas las reglas
   */
  clear() {
    this.rules.clear();
    this.rulesByLayer.source = [];
    this.rulesByLayer.derivation = [];
    this.rulesByLayer.semantic = [];
    this.rulesByLayer['cross-metadata'] = [];
    this.rulesByEntity.clear();
    this.invariants = [];
  }
}

// Singleton global
let globalRegistry = null;

export function getGlobalRegistry() {
  if (!globalRegistry) {
    globalRegistry = new RuleRegistry();
  }
  return globalRegistry;
}

export function resetGlobalRegistry() {
  globalRegistry = new RuleRegistry();
  return globalRegistry;
}

// Helper para crear reglas rápidamente
export function createRule(config) {
  return new ValidationRule(config);
}

export default { RuleRegistry, ValidationRule, getGlobalRegistry, createRule };
