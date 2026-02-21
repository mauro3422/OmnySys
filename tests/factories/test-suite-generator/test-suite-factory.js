/**
 * @fileoverview test-suite-factory.js
 * 
 * Función principal para crear test suites.
 * 
 * @module tests/factories/test-suite-generator/test-suite-factory
 */

import { describe, it } from 'vitest';
import { applyContract } from './contract-applier.js';

/**
 * Configuration types for test suite generation
 * @typedef {Object} TestSuiteConfig
 * @property {string} module - Module path (e.g., 'analyses/tier2/coupling')
 * @property {string} [name] - Optional display name (defaults to module)
 * @property {Object} [exports] - Module exports object
 * @property {string[]} [contracts] - List of contracts to apply: ['structure', 'error-handling', 'runtime', 'return-structure', 'async']
 * @property {Object} [contractOptions] - Options for specific contracts
 * @property {Function[]} [specificTests] - Array of test functions to run
 * @property {Object} [options] - Additional options
 * @property {boolean} [options.only=false] - Run with describe.only
 * @property {boolean} [options.skip=false] - Run with describe.skip
 */

/**
 * Creates a complete test suite with contracts and specific tests
 * 
 * @param {TestSuiteConfig} config - Configuration object
 * @example
 * createTestSuite({
 *   module: 'analyses/tier2/coupling',
 *   exports: { analyzeCoupling },
 *   contracts: ['structure', 'error-handling', 'return-structure'],
 *   contractOptions: {
 *     analyzeFn: analyzeCoupling,
 *     expectedFields: { couplings: 'array', maxCoupling: 'number' },
 *     createMockInput: () => createMockSystemMap()
 *   },
 *   specificTests: [
 *     { name: 'detects bidirectional coupling', fn: testBidirectionalCoupling }
 *   ]
 * });
 */
export function createTestSuite(config) {
  const {
    module: modulePath,
    name = modulePath,
    exports,
    contracts = [],
    contractOptions = {},
    specificTests = [],
    options = {}
  } = config;

  const describeFn = options.only ? describe.only : options.skip ? describe.skip : describe;

  describeFn(`${name}`, () => {
    // Apply requested contracts
    for (const contract of contracts) {
      applyContract(contract, modulePath, exports, contractOptions);
    }

    // Run specific tests
    if (specificTests.length > 0) {
      describe('Specific Behavior', () => {
        for (const test of specificTests) {
          if (typeof test === 'function') {
            test();
          } else if (test.name && test.fn) {
            it(test.name, test.fn);
          }
        }
      });
    }
  });
}
