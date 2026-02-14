/**
 * @fileoverview Contract Extractor
 * 
 * Orquesta la extracción de contratos desde múltiples fuentes.
 * 
 * @module type-contracts/extractors/contract-extractor
 * @version 1.0.0
 */

import { createLogger } from '../../../../utils/logger.js';
import { StrategyRegistry } from '../strategies/base-strategy.js';
import { JSDocStrategy } from '../strategies/jsdoc-strategy.js';
import { TypeScriptStrategy } from '../strategies/typescript-strategy.js';
import { InferenceStrategy } from '../strategies/inference-strategy.js';

const logger = createLogger('OmnySys:type-contracts:extractor');

/**
 * Registry global de estrategias
 */
const globalRegistry = new StrategyRegistry();
globalRegistry.register(new JSDocStrategy());
globalRegistry.register(new TypeScriptStrategy());
globalRegistry.register(new InferenceStrategy());

/**
 * Extrae contratos de tipo de una función
 * @param {string} code - Código fuente
 * @param {Object} jsdoc - JSDoc parseado
 * @param {Object} ast - AST de la función
 * @param {string} language - Lenguaje ('javascript' | 'typescript')
 * @returns {TypeContract}
 */
export function extractTypeContracts(code, jsdoc = {}, ast = {}, language = 'javascript') {
  const contracts = createEmptyContract();
  
  try {
    const context = { code, jsdoc, ast, language };
    
    // Extraer con todas las estrategias aplicables
    const results = globalRegistry.extractAll(context);
    
    if (results.length === 0) {
      return contracts;
    }

    // Fusionar resultados por prioridad
    for (const result of results.sort((a, b) => b.priority - a.priority)) {
      mergeContracts(contracts, result.contracts, result.source);
    }

    // Calcular confianza ponderada
    contracts.confidence = calculateWeightedConfidence(results);
    
    // Generar firma
    contracts.signature = generateSignature(contracts);

  } catch (error) {
    logger.warn('Failed to extract type contracts:', error.message);
  }
  
  return contracts;
}

/**
 * Crea un contrato vacío
 * @returns {TypeContract}
 */
function createEmptyContract() {
  return {
    params: [],
    returns: null,
    throws: [],
    generics: [],
    signature: null,
    confidence: 0
  };
}

/**
 * Fusiona contratos
 * @param {TypeContract} base - Contrato base
 * @param {Partial<TypeContract>} incoming - Nuevos datos
 * @param {string} source - Fuente de los datos
 */
function mergeContracts(base, incoming, source) {
  // Params: solo fusionar si no hay o si son inferidos
  if (incoming.params?.length > 0) {
    if (base.params.length === 0) {
      base.params = incoming.params;
    } else {
      // Completar información faltante
      for (let i = 0; i < incoming.params.length; i++) {
        if (i >= base.params.length) {
          base.params.push(incoming.params[i]);
        } else if (base.params[i].inferred && !incoming.params[i].inferred) {
          base.params[i] = { ...incoming.params[i] };
        }
      }
    }
  }

  // Returns: preferir no-inferido
  if (incoming.returns) {
    if (!base.returns || (base.returns.inferred && !incoming.returns.inferred)) {
      base.returns = { ...incoming.returns };
    }
  }

  // Throws: acumular
  if (incoming.throws?.length > 0) {
    const existing = new Set(base.throws.map(t => t.type));
    for (const t of incoming.throws) {
      if (!existing.has(t.type)) {
        base.throws.push(t);
      }
    }
  }

  // Generics: fusionar
  if (incoming.generics?.length > 0) {
    const existing = new Set(base.generics.map(g => g.name));
    for (const g of incoming.generics) {
      if (!existing.has(g.name)) {
        base.generics.push(g);
      }
    }
  }
}

/**
 * Calcula confianza ponderada
 * @param {Array} results - Resultados de estrategias
 * @returns {number}
 */
function calculateWeightedConfidence(results) {
  if (results.length === 0) return 0;
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const result of results) {
    const weight = result.priority / 100;
    totalWeight += weight;
    weightedSum += result.confidence * weight;
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0.3;
}

/**
 * Genera firma de función
 * @param {TypeContract} contracts - Contratos
 * @returns {string}
 */
export function generateSignature(contracts) {
  const params = contracts.params
    .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
    .join(', ');
  
  const returns = contracts.returns?.type || 'void';
  
  return `(${params}) => ${returns}`;
}

/**
 * Registra una estrategia personalizada
 * @param {ExtractionStrategy} strategy - Estrategia a registrar
 */
export function registerStrategy(strategy) {
  globalRegistry.register(strategy);
}

export default {
  extractTypeContracts,
  generateSignature,
  registerStrategy
};
