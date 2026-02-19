/**
 * @fileoverview Validator Helpers - Funciones compartidas para validadores
 * 
 * @module validation-engine/strategies/validator-helpers
 */

import { ValidationResult } from '../../core/results/index.js';

/**
 * Agrupa reglas por tipo de entidad
 * @param {Array} rules
 * @returns {Map}
 */
export function groupRulesByEntity(rules) {
  const grouped = new Map();
  for (const rule of rules) {
    for (const entityType of rule.appliesTo) {
      if (!grouped.has(entityType)) grouped.set(entityType, []);
      grouped.get(entityType).push(rule);
    }
  }
  return grouped;
}

/**
 * Obtiene entidades que son derivaciones
 * @param {ValidationContext} context
 * @returns {Array}
 */
export function getDerivationEntities(context) {
  const all = [
    ...context.getEntitiesByType('atom'),
    ...context.getEntitiesByType('molecule'),
    ...context.getEntitiesByType('module')
  ];
  return all.filter(e => e.source || e.derivedFrom);
}

/**
 * Valida una entidad contra un conjunto de reglas
 * @param {object} entity
 * @param {Array} rules
 * @param {ValidationContext} context
 * @param {Map} cache
 * @param {string} layer
 * @returns {Promise<Array>}
 */
export async function validateEntityRules(entity, rules, context, cache, layer) {
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
        entity.id, null, `Rule ${rule.id} skipped: missing required fields`,
        { rule: rule.id, layer }
      ));
      continue;
    }

    const result = await rule.validate(entity, context);
    result.layer = layer;
    
    if (cache) cache.set(cacheKey, result);
    results.push(result);
  }
  
  return results;
}

export default { groupRulesByEntity, getDerivationEntities, validateEntityRules };
