/**
 * @fileoverview Semantic Validator - Estrategia de validación semántica
 * 
 * Valida el flujo de datos, consistencia entre entidades y reglas semánticas.
 * Fase 3: Semantic Validation (Data Flow)
 * 
 * @module validation-engine/strategies/semantic-validator
 */

import { createLogger } from '../../../utils/logger.js';
import { ValidationResult } from '../../core/results/index.js';
import { BaseValidationStrategy } from './base-strategy.js';

const logger = createLogger('OmnySys:validation:semantic');

/**
 * Estrategia de validación semántica
 */
export class SemanticValidator extends BaseValidationStrategy {
  constructor() {
    super('semantic', 'semantic');
  }

  /**
   * Ejecuta validación semántica
   * @param {ValidationContext} context - Contexto de validación
   * @param {RuleRegistry} registry - Registro de reglas
   * @param {Map} cache - Caché de resultados
   * @returns {Promise<ValidationResult[]>}
   */
  async execute(context, registry, cache) {
    logger.info('Phase 3: Semantic validation (Data Flow)...');
    
    const rules = registry.getByLayer(this.layer);
    if (rules.length === 0) {
      logger.info('  No semantic rules registered');
      return [];
    }

    const results = [];
    const rulesByEntity = this.groupRulesByEntity(rules);

    for (const [entityType, typeRules] of rulesByEntity) {
      const entities = context.getEntitiesByType(entityType);
      logger.info(`  Validating ${entities.length} ${entityType}(s) with ${typeRules.length} semantic rules`);
      
      for (const entity of entities) {
        const entityResults = await this.validateEntity(entity, typeRules, context, cache);
        results.push(...entityResults);
      }
    }

    const validCount = results.filter(r => r.valid).length;
    logger.info(`  Semantic results: ${validCount}/${results.length} valid`);

    return results;
  }

  /**
   * Agrupa reglas por tipo de entidad
   * @private
   */
  groupRulesByEntity(rules) {
    const grouped = new Map();
    
    for (const rule of rules) {
      for (const entityType of rule.appliesTo) {
        if (!grouped.has(entityType)) {
          grouped.set(entityType, []);
        }
        grouped.get(entityType).push(rule);
      }
    }
    
    return grouped;
  }

  /**
   * Valida una entidad contra reglas semánticas
   * @private
   */
  async validateEntity(entity, rules, context, cache) {
    const results = [];
    
    for (const rule of rules) {
      if (!rule.appliesToEntity(entity)) continue;
      
      const cacheKey = `${entity.id}::${rule.id}`;
      if (cache?.has(cacheKey)) {
        results.push(cache.get(cacheKey));
        continue;
      }

      if (!rule.hasRequiredFields(entity, context)) {
        results.push(ValidationResult.warning(
          entity.id,
          null,
          `Rule ${rule.id} skipped: missing required fields`,
          { rule: rule.id, layer: this.layer }
        ));
        continue;
      }

      const result = await rule.validate(entity, context);
      result.layer = this.layer;
      
      if (cache) {
        cache.set(cacheKey, result);
      }
      
      results.push(result);
    }
    
    return results;
  }

  /**
   * Valida flujo de datos entre entidades relacionadas
   * @param {object} sourceEntity - Entidad origen
   * @param {object} targetEntity - Entidad destino
   * @param {RuleRegistry} registry
   * @param {ValidationContext} context
   * @returns {Promise<ValidationResult[]>}
   */
  async validateDataFlow(sourceEntity, targetEntity, registry, context) {
    const rules = registry.getDataFlowRules?.() || [];
    const results = [];
    
    for (const rule of rules) {
      if (rule.appliesToPair?.(sourceEntity, targetEntity)) {
        const result = await rule.validatePair(sourceEntity, targetEntity, context);
        result.layer = this.layer;
        results.push(result);
      }
    }
    
    return results;
  }
}

export default { SemanticValidator };
