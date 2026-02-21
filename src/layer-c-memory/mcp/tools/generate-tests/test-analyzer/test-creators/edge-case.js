/**
 * Edge case test creator
 * @module mcp/tools/generate-tests/test-analyzer/test-creators/edge-case
 */

import { generateEdgeCaseAssertion, generateAssertion } from '../test-utils.js';

/**
 * Crea tests de edge cases para TODOS los inputs
 * @param {Array} inputs - Function inputs
 * @param {Object} atom - Atom metadata
 * @returns {Array} - Array of edge case tests
 */
export function createEdgeCaseTests(inputs, atom) {
  const tests = [];

  for (const input of inputs) {
    tests.push({
      name: `should handle ${input.name} = null/undefined`,
      type: 'edge-case',
      description: `Edge case: ${input.name} vacio`,
      inputs: { [input.name]: 'null' },
      assertion: generateEdgeCaseAssertion(input.name, atom),
      priority: input.hasDefault ? 'low' : 'medium'
    });

    if (input.type === 'string' || input.name.toLowerCase().includes('text') ||
        input.name.toLowerCase().includes('code') || input.name.toLowerCase().includes('path')) {
      const emptyAssertion = generateAssertion(
        atom?.dataFlow?.outputs, atom?.name, atom?.typeContracts, atom
      );
      tests.push({
        name: `should handle ${input.name} = empty string`,
        type: 'edge-case',
        description: `Edge case: ${input.name} cadena vacía`,
        inputs: { [input.name]: '""' },
        assertion: emptyAssertion,
        priority: 'low'
      });
    }

    if (input.type === 'array' || input.name.toLowerCase().includes('arr') ||
        input.name.toLowerCase().includes('list') || input.name.toLowerCase().includes('items')) {
      tests.push({
        name: `should handle ${input.name} = empty array`,
        type: 'edge-case',
        description: `Edge case: ${input.name} array vacío`,
        inputs: { [input.name]: '[]' },
        assertion: generateAssertion(atom?.dataFlow?.outputs, atom?.name, atom?.typeContracts, atom),
        priority: 'low'
      });
    }
  }

  return tests;
}
