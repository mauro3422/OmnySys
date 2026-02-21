/**
 * Happy path test creator
 * @module mcp/tools/generate-tests/test-analyzer/test-creators/happy-path
 */

import { generateTypedInputs } from '../../input-generator.js';
import { generateSetup, generateAssertion } from '../test-utils.js';

/**
 * Crea test de happy path
 * @param {Array} inputs - Function inputs
 * @param {Array} outputs - Function outputs
 * @param {Object} typeContracts - Type contracts
 * @param {Object} atom - Atom metadata
 * @param {Object} sourcePatterns - Source patterns
 * @returns {Object} - Happy path test
 */
export function createHappyPathTest(inputs, outputs, typeContracts, atom, sourcePatterns) {
  const sourceExample = sourcePatterns?.examples?.find(e => e.type === 'object');
  
  return {
    name: `should return valid output for valid input`,
    type: 'happy-path',
    description: 'Caso exitoso basico con inputs validos',
    inputs: generateTypedInputs(inputs, typeContracts, atom),
    setup: generateSetup(atom),
    assertion: generateAssertion(outputs, atom.name, typeContracts, atom),
    priority: 'high',
    sourceExample: sourceExample?.value
  };
}
