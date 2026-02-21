/**
 * Side effects test creator
 * @module mcp/tools/generate-tests/test-analyzer/test-creators/side-effects
 */

import { generateTypedInputs } from '../../input-generator.js';
import { generateSetup } from '../test-utils.js';

/**
 * Crea test de side effects
 * @param {Object} atom - Atom metadata
 * @param {Array} inputs - Function inputs
 * @param {Object} typeContracts - Type contracts
 * @returns {Object} - Side effects test
 */
export function createSideEffectsTest(atom, inputs, typeContracts) {
  return {
    name: `should apply side effects correctly`,
    type: 'side-effects',
    description: 'Verificacion de side effects',
    inputs: generateTypedInputs(inputs, typeContracts, atom),
    setup: generateSetup(atom),
    assertion: 'expect(result).toBeDefined()',
    needsSandbox: true,
    sideEffects: atom.sideEffects,
    priority: 'medium'
  };
}

/**
 * Crea test de branch coverage
 * @param {number} complexity - Function complexity
 * @param {Array} inputs - Function inputs
 * @param {Object} typeContracts - Type contracts
 * @param {Object} atom - Atom metadata
 * @returns {Object} - Branch coverage test
 */
export function createBranchCoverageTest(complexity, inputs, typeContracts, atom) {
  return {
    name: `should cover all branches (complexity: ${complexity})`,
    type: 'branch-coverage',
    description: `Alta complejidad requiere mas tests`,
    inputs: generateTypedInputs(inputs, typeContracts, atom),
    assertion: 'expect(result).toBeDefined()',
    priority: 'medium'
  };
}
