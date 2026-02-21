/**
 * Throw test creator
 * @module mcp/tools/generate-tests/test-analyzer/test-creators/throw
 */

import { generateInputsForThrowCondition } from '../../input-generator.js';

/**
 * Crea tests para cada throw condition
 * @param {Object} errorFlow - Error flow metadata
 * @param {Array} inputs - Function inputs
 * @param {Object} typeContracts - Type contracts
 * @param {Object} atom - Atom metadata
 * @returns {Array} - Array of throw tests
 */
export function createThrowTests(errorFlow, inputs, typeContracts, atom) {
  const tests = [];
  const throws = errorFlow?.throws || [];
  
  for (const thrown of throws.slice(0, 3)) {
    const condition = thrown.condition || 'unknown';
    tests.push({
      name: `should throw ${thrown.type || 'Error'} when ${condition}`,
      type: 'error-throw',
      description: `Throw condition: ${condition} (line ${thrown.line})`,
      inputs: generateInputsForThrowCondition(thrown, inputs, typeContracts, atom),
      assertion: atom.isAsync 
        ? `await expect(${atom.name}(...)).rejects.toThrow()` 
        : `expect(() => ${atom.name}(...)).toThrow()`,
      throwInfo: thrown,
      priority: 'high'
    });
  }
  
  return tests;
}
