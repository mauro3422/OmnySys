/**
 * @fileoverview Syntax Validator - Estrategia de validación sintáctica
 * 
 * Valida la sintaxis de código fuente y estructura básica.
 * Fase 1: Source Validation (Ground Truth)
 * 
 * @module validation-engine/strategies/syntax-validator
 */

import { createLogger } from '../../../utils/logger.js';
import { ValidationResult } from '../../core/results/index.js';
import { BaseValidationStrategy } from './base-strategy.js';

const logger = createLogger('OmnySys:validation:syntax');

/**
 * Estrategia de validación sintáctica
 */
export class SyntaxValidator extends BaseValidationStrategy {
  constructor() {
    super('syntax', 'source');
  }

  /**
   * Ejecuta validación sintáctica en todas las entidades
   * @param {ValidationContext} context - Contexto de validación
   * @param {RuleRegistry} registry - Registro de reglas
   * @param {Map} cache - Caché de resultados
   * @returns {Promise<ValidationResult[]>}
   */
  async execute(context, registry, cache) {
    logger.info('Phase 1: Syntax validation (Ground Truth)...');
    
    const rules = registry.getByLayer(this.layer);
    if (rules.length === 0) {
      logger.info('  No syntax rules registered');
      return [];
    }

    const results = [];
    const entities = context.getEntitiesByType('file');
    
    logger.info(`  Validating ${entities.length} files with ${rules.length} rules`);

    for (const entity of entities) {
      const entityResults = await this.validateEntity(entity, rules, context, cache);
      results.push(...entityResults);
    }

    const validCount = results.filter(r => r.valid).length;
    logger.info(`  Syntax results: ${validCount}/${results.length} valid`);

    return results;
  }

  /**
   * Valida una entidad contra reglas sintácticas
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
   * Verifica si puede validar la entidad (archivos de código)
   * @param {object} entity 
   * @returns {boolean}
   */
  canValidate(entity) {
    return entity && (entity.path || entity._omnysysPath);
  }
}

export default { SyntaxValidator };
