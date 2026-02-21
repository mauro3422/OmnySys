/**
 * @fileoverview Input Generator for Test Generation
 * 
 * Genera inputs de prueba basados en metadata de la función y el grafo.
 * Usa las dependencias reales del grafo en lugar de mocks genéricos.
 * 
 * @module mcp/tools/generate-tests/input-generator
 */

import { generateSampleValueForType } from './input-generator/value-generators.js';
import { analyzeThrowCondition, generateFailingSafetyOptions, generateFailingSyntaxOptions } from './input-generator/throw-generators.js';
import { generateInvalidInputs } from './input-generator/invalid-generators.js';

/**
 * Genera inputs tipados basados en el análisis completo del átomo
 * @param {Array} inputs - Function inputs
 * @param {Object} typeContracts - Type contracts
 * @param {Object} atom - Atom metadata
 * @returns {Object} - Generated typed inputs
 */
export function generateTypedInputs(inputs, typeContracts, atom = {}) {
  if (!inputs || inputs.length === 0) return {};
  
  const result = {};
  const params = typeContracts?.params || [];
  
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const paramType = params[i]?.type || input.type;
    result[input.name] = generateSampleValueForType(paramType, input.name, atom);
  }
  return result;
}

/**
 * Genera inputs para disparar una condición de throw específica
 * @param {Object} thrown - Throw condition metadata
 * @param {Array} inputs - Function inputs
 * @param {Object} typeContracts - Type contracts
 * @param {Object} atom - Atom metadata
 * @returns {Object} - Generated throw inputs
 */
export function generateInputsForThrowCondition(thrown, inputs, typeContracts, atom) {
  const condition = thrown.condition || '';
  const result = generateTypedInputs(inputs, typeContracts, atom);
  
  const throwInput = analyzeThrowCondition(condition, thrown, atom);
  
  return { ...result, ...throwInput };
}

export {
  generateSampleValueForType,
  generateInvalidInputs,
  analyzeThrowCondition,
  generateFailingSafetyOptions,
  generateFailingSyntaxOptions
};

export default {
  generateTypedInputs,
  generateSampleValueForType,
  generateInputsForThrowCondition,
  generateInvalidInputs
};
