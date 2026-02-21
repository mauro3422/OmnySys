/**
 * @fileoverview test-suite-builders.js
 * 
 * Builders para crear diferentes tipos de test suites.
 * 
 * @module tests/factories/test-suite-generator/test-suite-builders
 */

import { describe } from 'vitest';
import { ContractPresets } from './contracts.js';
import { createTestSuite } from './test-suite-factory.js';

/**
 * Creates a test suite using a predefined preset
 * 
 * @param {string} presetName - Name of the preset: 'analysis', 'detector', 'utility'
 * @param {Object} config - Configuration for the preset
 * @param {Object} config.module - Module configuration
 * @param {Object} config.contractOptions - Options for contracts
 * @param {Array} config.specificTests - Additional specific tests
 * 
 * @example
 * createTestSuiteWithPreset('analysis', {
 *   module: { path: 'analyses/tier2/coupling', exports: { analyzeCoupling } },
 *   contractOptions: { analyzeFn: analyzeCoupling, expectedFields: { couplings: 'array' } },
 *   specificTests: [testBidirectionalCoupling]
 * });
 */
export function createTestSuiteWithPreset(presetName, config) {
  const { module, contractOptions = {}, specificTests = [] } = config;
  
  const preset = ContractPresets[presetName];
  if (!preset) {
    throw new Error(`[TestSuiteGenerator] Unknown preset: ${presetName}. Available: ${Object.keys(ContractPresets).join(', ')}`);
  }

  const contracts = preset(contractOptions);
  
  describe(`${module.path}`, () => {
    // Apply all contracts from the preset
    for (const [contractName, contractFn] of Object.entries(contracts)) {
      if (contractName === 'structure' && module.exports) {
        contractFn(module.exports);
      } else {
        contractFn();
      }
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

/**
 * Creates a batch of test suites for multiple modules
 * Useful for applying the same contracts to a group of related modules
 * 
 * @param {Object} config
 * @param {string} config.groupName - Name of the group
 * @param {string[]} config.modules - Array of module paths
 * @param {string[]} config.contracts - Contracts to apply to all
 * @param {Object} config.contractOptions - Shared contract options
 * @param {Function} config.getModuleExports - Function to get exports for each module
 * @param {Function} [config.getSpecificTests] - Function to get specific tests for each module
 * 
 * @example
 * createBatchTestSuites({
 *   groupName: 'Tier 2 Analyses',
 *   modules: ['analyses/tier2/coupling', 'analyses/tier2/circular-imports'],
 *   contracts: ['structure', 'error-handling'],
 *   contractOptions: { expectedSafeResult: { total: 0 } },
 *   getModuleExports: (modulePath) => require(`#layer-a/${modulePath}`),
 *   getSpecificTests: (modulePath) => getTestsForModule(modulePath)
 * });
 */
export function createBatchTestSuites(config) {
  const {
    groupName,
    modules,
    contracts,
    contractOptions = {},
    getModuleExports,
    getSpecificTests
  } = config;

  describe(groupName, () => {
    for (const modulePath of modules) {
      const exports = getModuleExports(modulePath);
      const specificTests = getSpecificTests ? getSpecificTests(modulePath) : [];

      createTestSuite({
        module: modulePath,
        exports,
        contracts,
        contractOptions: {
          ...contractOptions,
          analyzeFn: exports[modulePath.split('/').pop()]
        },
        specificTests
      });
    }
  });
}

/**
 * Creates a focused test suite for debugging
 * Wraps the suite with describe.only
 * 
 * @param {TestSuiteConfig} config - Same as createTestSuite
 */
export function createFocusedTestSuite(config) {
  return createTestSuite({
    ...config,
    options: { ...config.options, only: true }
  });
}

/**
 * Creates a skipped test suite
 * Wraps the suite with describe.skip
 * 
 * @param {TestSuiteConfig} config - Same as createTestSuite
 */
export function createSkippedTestSuite(config) {
  return createTestSuite({
    ...config,
    options: { ...config.options, skip: true }
  });
}
