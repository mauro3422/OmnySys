/**
 * @fileoverview RuleRegistry - Registro de reglas de validación
 * @module validation/core/rules/RuleRegistry
 */

import { ValidationRule } from './ValidationRule.js';

/**
 * Registro de reglas de validación
 * Singleton que mantiene todas las reglas registradas.
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

    if (this.rules.has(rule.id)) {
      throw new Error(`Rule with id '${rule.id}' already registered`);
    }

    this.rules.set(rule.id, rule);

    if (this.rulesByLayer[rule.layer]) {
      this.rulesByLayer[rule.layer].push(rule);
    }

    for (const entityType of rule.appliesTo) {
      if (!this.rulesByEntity.has(entityType)) {
        this.rulesByEntity.set(entityType, []);
      }
      this.rulesByEntity.get(entityType).push(rule);
    }

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

    return rules.filter(rule => rule.hasRequiredFields(entity, context));
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
