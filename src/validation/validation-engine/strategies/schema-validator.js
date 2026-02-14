/**
 * @fileoverview Schema Validator - Estrategia de validación de esquema
 * 
 * @module validation-engine/strategies/schema-validator
 */

import { createLogger } from '../../../utils/logger.js';
import { ValidationResult } from '../../core/validation-result.js';
import { BaseValidationStrategy } from './base-strategy.js';
import { groupRulesByEntity, getDerivationEntities, validateEntityRules } from './validator-helpers.js';

const logger = createLogger('OmnySys:validation:schema');

export class SchemaValidator extends BaseValidationStrategy {
  constructor() {
    super('schema', 'derivation');
  }

  async execute(context, registry, cache) {
    const results = [];
    results.push(...await this.validateDerivations(context, registry, cache));
    results.push(...await this.validateCrossMetadata(context, registry, cache));
    return results;
  }

  async validateDerivations(context, registry, cache) {
    logger.info('Phase 2: Derivation validation (Fractal)...');
    const rules = registry.getByLayer('derivation');
    if (rules.length === 0) return [];

    const entities = getDerivationEntities(context);
    logger.info(`  Validating ${entities.length} derivations with ${rules.length} rules`);

    const results = [];
    for (const entity of entities) {
      results.push(...await validateEntityRules(entity, rules, context, cache, 'derivation'));
    }

    logger.info(`  Derivation results: ${results.filter(r => r.valid).length}/${results.length} valid`);
    return results;
  }

  async validateCrossMetadata(context, registry, cache) {
    logger.info('Phase 4: Cross-metadata validation (Insights)...');
    const rules = registry.getByLayer('cross-metadata');
    if (rules.length === 0) return [];

    const rulesByEntity = groupRulesByEntity(rules);
    const results = [];

    for (const [entityType, typeRules] of rulesByEntity) {
      const entities = context.getEntitiesByType(entityType);
      logger.info(`  Validating ${entities.length} ${entityType}(s) with ${typeRules.length} rules`);
      for (const entity of entities) {
        results.push(...await validateEntityRules(entity, typeRules, context, cache, 'cross-metadata'));
      }
    }

    logger.info(`  Cross-metadata results: ${results.filter(r => r.valid).length}/${results.length} valid`);
    return results;
  }

  validateSchemaCompatibility(oldSchema, newSchema) {
    const results = [];
    const oldFields = new Set(Object.keys(oldSchema.properties || {}));
    const newFields = new Set(Object.keys(newSchema.properties || {}));
    
    for (const field of oldFields) {
      if (!newFields.has(field)) {
        results.push(ValidationResult.warning(
          'schema', field, `Field '${field}' removed - potential breaking change`,
          { severity: 'warning', layer: 'cross-metadata' }
        ));
      }
    }
    return results;
  }
}

export default { SchemaValidator };
