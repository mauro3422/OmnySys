/**
 * @fileoverview Core Test Suite Generator
 * 
 * Provides the main functions for generating complete test suites.
 * This is the heart of the Meta-Factory pattern.
 * 
 * @module tests/factories/test-suite-generator/core
 */

import { describe, it, expect } from 'vitest';
import {
  createStructureContract,
  createErrorHandlingContract,
  createRuntimeContract,
  createReturnStructureContract,
  createAsyncContract,
  ContractPresets
} from './contracts.js';

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

/**
 * Applies a single contract to the test suite
 * 
 * @private
 * @param {string} contractName - Name of the contract to apply
 * @param {string} modulePath - Path to the module
 * @param {Object} exports - Module exports
 * @param {Object} options - Contract options
 */
function applyContract(contractName, modulePath, exports, options) {
  const moduleName = modulePath.split('/').pop();

  switch (contractName) {
    case 'structure':
      createStructureContract({
        moduleName,
        exports,
        exportNames: options.exportNames || [moduleName]
      });
      break;

    case 'error-handling':
      if (!options.analyzeFn && !options.testFn) {
        console.warn(`[TestSuiteGenerator] error-handling contract requires 'analyzeFn' or 'testFn' for ${modulePath}`);
        break;
      }
      createErrorHandlingContract({
        moduleName,
        testFn: options.analyzeFn || options.testFn,
        options: {
          async: options.async !== false,
          expectedSafeResult: options.expectedSafeResult ?? { total: 0 }
        }
      });
      break;

    case 'runtime':
      createRuntimeContract({
        modulePath: `${modulePath}.js`,
        expectedError: options.expectedRuntimeError
      });
      break;

    case 'return-structure':
      if (!options.analyzeFn && !options.testFn) {
        console.warn(`[TestSuiteGenerator] return-structure contract requires 'analyzeFn' or 'testFn' for ${modulePath}`);
        break;
      }
      createReturnStructureContract({
        moduleName,
        testFn: options.analyzeFn || options.testFn,
        expectedStructure: options.expectedFields || { total: 'number' },
        createValidInput: options.createMockInput
      });
      break;

    case 'async':
      if (!options.analyzeFn && !options.testFn && !options.asyncFn) {
        console.warn(`[TestSuiteGenerator] async contract requires 'analyzeFn', 'testFn', or 'asyncFn' for ${modulePath}`);
        break;
      }
      createAsyncContract({
        moduleName,
        asyncFn: options.asyncFn || options.analyzeFn || options.testFn
      });
      break;

    default:
      console.warn(`[TestSuiteGenerator] Unknown contract: ${contractName}`);
  }
}

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

/**
 * Utility function to run a test with automatic cleanup
 * 
 * @param {Function} testFn - Test function to run
 * @param {Function} cleanupFn - Cleanup function to run after test
 * @param {Object} context - Test context
 */
export async function runTestWithCleanup(testFn, cleanupFn, context = {}) {
  try {
    await testFn(context);
  } finally {
    await cleanupFn(context);
  }
}

/**
 * Validates that a test suite configuration is valid
 * 
 * @param {TestSuiteConfig} config - Configuration to validate
 * @returns {Object} Validation result
 */
export function validateTestSuiteConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config.module) {
    errors.push('Missing required field: module');
  }

  if (config.contracts) {
    const validContracts = ['structure', 'error-handling', 'runtime', 'return-structure', 'async'];
    for (const contract of config.contracts) {
      if (!validContracts.includes(contract)) {
        errors.push(`Invalid contract: ${contract}. Valid: ${validContracts.join(', ')}`);
      }
    }

    if (config.contracts.includes('error-handling') && !config.contractOptions?.analyzeFn && !config.contractOptions?.testFn) {
      warnings.push('error-handling contract should have analyzeFn or testFn in contractOptions');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
