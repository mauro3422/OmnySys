/**
 * @fileoverview JSDoc Extraction Strategy
 * 
 * Extrae tipos desde anotaciones JSDoc.
 * 
 * @module type-contracts/strategies/jsdoc-strategy
 * @version 1.0.0
 */

import { ExtractionStrategy } from './base-strategy.js';
import { normalizeType, extractThrowCondition } from '../types/type-analyzer.js';

/**
 * Estrategia de extracción desde JSDoc
 */
export class JSDocStrategy extends ExtractionStrategy {
  constructor() {
    super('jsdoc', 100); // Alta prioridad
  }

  canHandle(context) {
    return context.jsdoc && 
           (context.jsdoc.params || context.jsdoc.returns || context.jsdoc.throws);
  }

  extract(context) {
    const { jsdoc } = context;
    const contracts = {};

    if (jsdoc.params) {
      contracts.params = jsdoc.params.map(p => ({
        name: p.name,
        type: normalizeType(p.type),
        optional: p.optional || false,
        defaultValue: p.defaultValue,
        description: p.description,
        inferred: false
      }));
    }

    if (jsdoc.returns) {
      contracts.returns = {
        type: normalizeType(jsdoc.returns.type),
        description: jsdoc.returns.description,
        nullable: this.isNullable(jsdoc.returns.type),
        inferred: false
      };
    }

    if (jsdoc.throws) {
      contracts.throws = jsdoc.throws.map(t => ({
        type: t.type || 'Error',
        description: t.description,
        condition: extractThrowCondition(t.description)
      }));
    }

    if (jsdoc.template || jsdoc.generics) {
      contracts.generics = this.extractGenerics(jsdoc.template || jsdoc.generics);
    }

    return Object.keys(contracts).length > 0 ? contracts : null;
  }

  calculateConfidence(contracts) {
    let score = 0;
    let maxScore = 0;

    if (contracts.params?.length > 0) {
      score += 0.4;
      maxScore += 0.4;
    }

    if (contracts.returns) {
      score += 0.3;
      maxScore += 0.3;
    }

    if (contracts.throws?.length > 0) {
      score += 0.2;
      maxScore += 0.2;
    }

    return maxScore > 0 ? score / maxScore : 0.3;
  }

  isNullable(type) {
    return type?.includes('null') || type?.includes('undefined') || type?.endsWith('?');
  }

  extractGenerics(template) {
    if (Array.isArray(template)) {
      return template.map(g => ({
        name: typeof g === 'string' ? g : g.name,
        constraint: g.extends || g.constraint,
        default: g.default
      }));
    }
    if (typeof template === 'string') {
      return template.split(',').map(n => ({ name: n.trim() }));
    }
    return [];
  }
}

export default JSDocStrategy;
