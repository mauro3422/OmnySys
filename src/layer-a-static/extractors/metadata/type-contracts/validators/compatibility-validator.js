/**
 * @fileoverview Type Compatibility Validator
 * 
 * Valida compatibilidad entre tipos con sistema de reglas extensible.
 * 
 * @module type-contracts/validators/compatibility-validator
 * @version 1.0.0
 */

import { analyzeType, normalizeType, isNullableType } from '../types/type-analyzer.js';
import { COERCION_TYPES } from '../types/index.js';

/**
 * Regla de compatibilidad
 * @typedef {Function} CompatibilityRule
 * @param {string} outputType - Tipo de salida
 * @param {string} inputType - Tipo de entrada
 * @returns {CompatibilityResult|null} Resultado o null si no aplica
 */

/**
 * Motor de validación de compatibilidad
 */
export class CompatibilityEngine {
  constructor() {
    this.rules = [];
    this.registerDefaultRules();
  }

  /**
   * Registra una regla de compatibilidad
   * @param {CompatibilityRule} rule - Función de validación
   * @param {number} priority - Prioridad (mayor = primero)
   */
  registerRule(rule, priority = 0) {
    this.rules.push({ rule, priority });
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Valida compatibilidad entre dos tipos
   * @param {string} outputType - Tipo de salida
   * @param {string} inputType - Tipo de entrada
   * @returns {CompatibilityResult}
   */
  validate(outputType, inputType) {
    if (!outputType || !inputType) {
      return {
        compatible: true,
        confidence: 0.3,
        coercion: COERCION_TYPES.NONE,
        nullable: false,
        reason: 'Missing type information'
      };
    }

    const out = normalizeType(outputType);
    const inp = normalizeType(inputType);

    // Exact match
    if (out === inp) {
      return {
        compatible: true,
        confidence: 1.0,
        coercion: COERCION_TYPES.NONE,
        nullable: isNullableType(inp)
      };
    }

    // Probar reglas en orden
    for (const { rule } of this.rules) {
      const result = rule(out, inp);
      if (result) return result;
    }

    // Default: incompatible
    return {
      compatible: false,
      confidence: 0.2,
      coercion: COERCION_TYPES.NONE,
      nullable: isNullableType(inp),
      reason: `Types incompatible: ${out} vs ${inp}`
    };
  }

  registerDefaultRules() {
    // Regla 1: any acepta todo
    this.registerRule((out, inp) => {
      if (inp === 'any' || out === 'any') {
        return {
          compatible: true,
          confidence: 0.5,
          coercion: COERCION_TYPES.IMPLICIT,
          nullable: false
        };
      }
      return null;
    }, 100);

    // Regla 2: unknown puede ser cualquier cosa
    this.registerRule((out, inp) => {
      if (inp === 'unknown') {
        return {
          compatible: true,
          confidence: 0.6,
          coercion: COERCION_TYPES.EXPLICIT,
          nullable: true
        };
      }
      return null;
    }, 95);

    // Regla 3: never solo acepta never
    this.registerRule((out, inp) => {
      if (inp === 'never') {
        return {
          compatible: out === 'never',
          confidence: 1.0,
          coercion: COERCION_TYPES.NONE,
          nullable: false,
          reason: out === 'never' ? null : 'never cannot accept other types'
        };
      }
      return null;
    }, 94);

    // Regla 4: nullable types
    this.registerRule((out, inp) => {
      if (inp === 'null' || inp === 'undefined') {
        return {
          compatible: out === inp || isNullableType(out),
          confidence: 0.8,
          coercion: COERCION_TYPES.NONE,
          nullable: true
        };
      }
      return null;
    }, 90);

    // Regla 5: subtipos primitivos
    this.registerRule((out, inp) => {
      const subtypeMap = {
        'number': ['integer', 'float', 'double'],
        'string': ['char'],
        'Array': ['any[]', 'string[]', 'number[]', 'Object[]'],
        'Object': ['Record', 'Map', 'Set', 'object']
      };

      for (const [base, subtypes] of Object.entries(subtypeMap)) {
        if (out === base && subtypes.includes(inp)) {
          return {
            compatible: true,
            confidence: 0.9,
            coercion: COERCION_TYPES.NONE,
            nullable: false
          };
        }
        if (subtypes.includes(out) && inp === base) {
          return {
            compatible: true,
            confidence: 0.8,
            coercion: COERCION_TYPES.IMPLICIT,
            nullable: false
          };
        }
      }
      return null;
    }, 80);

    // Regla 6: Generics (Promise<T>, Array<T>)
    this.registerRule((out, inp) => {
      const outGen = analyzeType(out);
      const inpGen = analyzeType(inp);

      if (outGen.generics && inpGen.generics && outGen.baseType === inpGen.baseType) {
        // Validar compatibilidad de parámetros genéricos
        const innerResults = outGen.generics.map((g, i) => 
          this.validate(g, inpGen.generics[i] || 'any')
        );

        const allCompatible = innerResults.every(r => r.compatible);
        const minConfidence = Math.min(...innerResults.map(r => r.confidence));

        return {
          compatible: allCompatible,
          confidence: minConfidence * 0.95,
          coercion: COERCION_TYPES.NONE,
          nullable: outGen.nullable || inpGen.nullable
        };
      }
      return null;
    }, 70);

    // Regla 7: Union types
    this.registerRule((out, inp) => {
      if (inp.includes('|')) {
        const types = inp.split('|').map(t => t.trim());
        const results = types.map(t => this.validate(out, t));
        
        const compatible = results.some(r => r.compatible);
        const maxConfidence = Math.max(...results.map(r => r.confidence));

        return {
          compatible,
          confidence: compatible ? maxConfidence * 0.7 : 0.2,
          coercion: COERCION_TYPES.NONE,
          nullable: types.some(t => isNullableType(t))
        };
      }
      return null;
    }, 60);

    // Regla 8: void solo acepta undefined/null
    this.registerRule((out, inp) => {
      if (inp === 'void') {
        return {
          compatible: out === 'undefined' || out === 'void' || out === 'null',
          confidence: 1.0,
          coercion: COERCION_TYPES.NONE,
          nullable: false
        };
      }
      return null;
    }, 50);
  }
}

// Instancia singleton
const defaultEngine = new CompatibilityEngine();

/**
 * Valida compatibilidad usando el motor por defecto
 * @param {string} outputType - Tipo de salida
 * @param {string} inputType - Tipo de entrada
 * @returns {CompatibilityResult}
 */
export function validateTypeCompatibility(outputType, inputType) {
  return defaultEngine.validate(outputType, inputType);
}

/**
 * Obtiene el motor por defecto para configuración personalizada
 * @returns {CompatibilityEngine}
 */
export function getCompatibilityEngine() {
  return defaultEngine;
}

export default {
  CompatibilityEngine,
  validateTypeCompatibility,
  getCompatibilityEngine
};
