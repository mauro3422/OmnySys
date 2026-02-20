/**
 * @fileoverview Inference Extraction Strategy
 * 
 * Infiere tipos desde el código cuando no hay anotaciones.
 * 
 * @module type-contracts/strategies/inference-strategy
 * @version 1.0.0
 */

import { ExtractionStrategy } from './base-strategy.js';

/**
 * Estrategia de inferencia de tipos desde código
 */
export class InferenceStrategy extends ExtractionStrategy {
  constructor() {
    super('inference', 10); // Baja prioridad
  }

  canHandle(context) {
    return !!context.code;
  }

  extract(context) {
    const { code } = context;
    const contracts = {};

    contracts.params = this.inferParams(code);
    contracts.returns = this.inferReturn(code);

    return contracts;
  }

  inferParams(code) {
    const params = [];
    
    // Extraer nombres de parámetros de función
    const patterns = [
      /function\s*\w*\s*\(([^)]*)\)/,
      /\(([^)]*)\)\s*=>/,
      /(?:\w+)\s*:\s*function\s*\(([^)]*)\)/
    ];

    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match) {
        const names = match[1]
          .split(',')
          .map(p => p.trim().split('=')[0].trim().split(':')[0].trim())
          .filter(n => n && !n.startsWith('...'));
        
        for (const name of names) {
          params.push({
            name,
            type: this.inferTypeFromUsage(code, name),
            inferred: true
          });
        }
        break;
      }
    }

    return params;
  }

  inferReturn(code) {
    // Buscar returns
    const returns = code.match(/return\s+(.+?)(?:;|$)/gm);
    
    if (!returns) {
      return { type: 'void', inferred: true };
    }

    const returnValues = returns.map(r => {
      const match = r.match(/return\s+(.+?)(?:;|$)/);
      return match ? match[1].trim() : 'unknown';
    });

    // Inferir tipo común
    return { type: this.inferCommonType(returnValues), inferred: true };
  }

  inferTypeFromUsage(code, paramName) {
    const escaped = paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Destructuring: const { x, y } = param  OR  const { x } = param
    if (new RegExp(`\\{[^}]+\\}\\s*=\\s*${escaped}`).test(code)) return 'Object';

    // Path-like: param ends with Path/Dir/File/Url → string
    if (/Path|Dir|File|Url|Uri|Name|Key|Id$/.test(paramName)) return 'string';

    // Patrones de uso ordenados por especificidad (mayor primero)
    const patterns = [
      { test: new RegExp(`${escaped}\\s*\\+\\s*['\"]`), type: 'string' },
      { test: new RegExp(`${escaped}\\.length`), type: 'string | Array' },
      { test: new RegExp(`typeof\\s+${escaped}\\s*===?\\s*['"]string`), type: 'string' },
      { test: new RegExp(`typeof\\s+${escaped}\\s*===?\\s*['"]number`), type: 'number' },
      { test: new RegExp(`Array\\.isArray\\(${escaped}\\)`), type: 'Array' },
      { test: new RegExp(`${escaped}\\s*[+*/-]\\s*\\d`), type: 'number' },
      { test: new RegExp(`await\\s+${escaped}`), type: 'Promise' },
      { test: new RegExp(`${escaped}\\s*\\(`), type: 'Function' },
      { test: new RegExp(`${escaped}\\.`), type: 'Object' }
    ];

    for (const { test, type } of patterns) {
      if (test.test(code)) return type;
    }

    return 'any';
  }

  inferCommonType(values) {
    const types = values.map(v => this.getLiteralType(v));
    const unique = [...new Set(types)];
    
    if (unique.length === 1) return unique[0];
    if (unique.every(t => ['string', 'number', 'boolean'].includes(t))) {
      return unique.join(' | ');
    }
    return 'any';
  }

  getLiteralType(value) {
    if (!value) return 'void';
    if (value.startsWith('"') || value.startsWith("'") || value.startsWith('`')) return 'string';
    if (value.startsWith('[')) return 'Array';
    if (value.startsWith('{')) return 'Object';
    if (/^\d/.test(value)) return 'number';
    if (value === 'true' || value === 'false') return 'boolean';
    if (value === 'null') return 'null';
    if (value === 'undefined') return 'undefined';
    return 'any';
  }

  calculateConfidence(contracts) {
    // Inferencia siempre tiene baja confianza
    return 0.3;
  }
}

export default InferenceStrategy;
