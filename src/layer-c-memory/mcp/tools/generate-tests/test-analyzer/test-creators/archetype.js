/**
 * Archetype-based test creator
 * @module mcp/tools/generate-tests/test-analyzer/test-creators/archetype
 */

import { generateTypedInputs, generateInvalidInputs } from '../../input-generator.js';
import { generateSetup } from '../test-utils.js';

/**
 * Crea tests basados en archetype, callerPattern y dna.flowType
 * @param {Object} atom - Atom metadata
 * @param {string} archetype - Archetype type
 * @param {Array} inputs - Function inputs
 * @param {Object} typeContracts - Type contracts
 * @returns {Array} - Array of archetype-based tests
 */
export function createArchetypeTests(atom, archetype, inputs, typeContracts) {
  const tests = [];
  const typedInputs = generateTypedInputs(inputs, typeContracts, atom);
  const callerPattern = atom.callerPattern?.id || 'direct_call';
  const dnaFlow = atom.dna?.flowType || '';
  const calledBy = atom.calledBy || [];

  const invocationNote = callerPattern === 'callback'
    ? ' (invocado como callback)'
    : callerPattern === 'event_handler'
      ? ' (invocado como event handler)'
      : '';

  if (calledBy.length > 0 && calledBy.length <= 5) {
    const callerNames = calledBy.map(c => c.split('::').pop()).join(', ');
    tests.push({
      name: `should integrate correctly with callers`,
      type: 'integration',
      description: `Llamado desde: ${callerNames}`,
      inputs: typedInputs,
      assertion: 'expect(result).toBeDefined()',
      priority: 'medium',
      note: `Callers reales: ${calledBy.slice(0, 3).join(', ')}`
    });
  }

  switch (archetype) {
    case 'orchestrator': {
      const internalCalls = atom.callGraph?.callsList?.filter(c => c.type !== 'native').slice(0, 5) || [];
      tests.push({
        name: `should orchestrate internal calls correctly${invocationNote}`,
        type: 'integration',
        description: `Orquesta: ${internalCalls.map(c => c.name).join(', ') || 'múltiples funciones'}`,
        inputs: typedInputs,
        assertion: 'expect(result).toBeDefined()',
        internalCalls,
        priority: 'medium'
      });
      break;
    }

    case 'transformer': {
      const transformAssertion = dnaFlow.includes('return')
        ? 'expect(result).not.toEqual(expect.objectContaining({}))'
        : 'expect(result).toBeDefined()';
      tests.push({
        name: `should transform input to expected output${invocationNote}`,
        type: 'transformation',
        description: `Flow: ${dnaFlow || 'transform'}`,
        inputs: typedInputs,
        assertion: transformAssertion,
        priority: 'medium'
      });
      break;
    }

    case 'validator':
      tests.push({
        name: `should return boolean validation result${invocationNote}`,
        type: 'validation',
        description: 'Valida y retorna boolean',
        inputs: typedInputs,
        assertion: 'expect(typeof result).toBe("boolean")',
        priority: 'medium'
      });
      tests.push({
        name: `should return false for invalid input`,
        type: 'validation-negative',
        description: 'Caso inválido retorna false',
        inputs: generateInvalidInputs(inputs),
        assertion: 'expect(result).toBe(false)',
        priority: 'high'
      });
      break;

    case 'handler':
      tests.push({
        name: `should handle event/data correctly${invocationNote}`,
        type: 'handler',
        description: callerPattern === 'event_handler'
          ? 'Handler de evento — verificar que no lanza'
          : 'Procesa datos de entrada',
        inputs: typedInputs,
        assertion: callerPattern === 'event_handler'
          ? 'expect(() => result).not.toThrow()'
          : 'expect(result).toBeDefined()',
        priority: 'medium'
      });
      break;

    case 'factory':
      tests.push({
        name: `should create and return a valid object`,
        type: 'factory',
        description: `Factory — DNA: ${dnaFlow || 'create-return'}`,
        inputs: typedInputs,
        assertion: 'expect(result).toEqual(expect.objectContaining({}))',
        priority: 'high'
      });
      break;

    case 'persister':
      tests.push({
        name: `should persist data without throwing`,
        type: 'persister',
        description: 'Persiste datos — verificar que completa sin error',
        inputs: typedInputs,
        assertion: 'expect(result).toBeDefined()',
        needsSandbox: true,
        priority: 'medium'
      });
      break;
  }

  return tests;
}
