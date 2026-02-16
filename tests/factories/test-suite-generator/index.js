/**
 * @fileoverview Test Suite Generator - Entry Point
 * 
 * Meta-Factory for creating standardized test suites across Layer A.
 * Provides reusable contracts, presets, and test generation utilities.
 * 
 * Usage:
 *   import { createTestSuite, Contracts } from '#test-factories/test-suite-generator';
 * 
 * @module tests/factories/test-suite-generator
 */

// Core test generation functions
export {
  createTestSuite,
  createTestSuiteWithPreset,
  createBatchTestSuites,
  createFocusedTestSuite,
  createSkippedTestSuite,
  runTestWithCleanup,
  validateTestSuiteConfig
} from './core.js';

// Contract test functions
export {
  createStructureContract,
  createErrorHandlingContract,
  createRuntimeContract,
  createReturnStructureContract,
  createAsyncContract,
  ContractPresets
} from './contracts.js';

// Re-export all as a unified API for convenience
import * as Core from './core.js';
import * as ContractModule from './contracts.js';

/**
 * Unified Test Suite Generator API
 * Provides a clean namespace for all test generation functions
 */
export const TestSuiteGenerator = {
  // Core functions
  create: Core.createTestSuite,
  createWithPreset: Core.createTestSuiteWithPreset,
  createBatch: Core.createBatchTestSuites,
  createFocused: Core.createFocusedTestSuite,
  createSkipped: Core.createSkippedTestSuite,
  runWithCleanup: Core.runTestWithCleanup,
  validate: Core.validateTestSuiteConfig,

  // Contract functions
  Contracts: {
    structure: ContractModule.createStructureContract,
    errorHandling: ContractModule.createErrorHandlingContract,
    runtime: ContractModule.createRuntimeContract,
    returnStructure: ContractModule.createReturnStructureContract,
    async: ContractModule.createAsyncContract,
    presets: ContractModule.ContractPresets
  }
};

/**
 * Quick-start aliases for common patterns
 */

/**
 * Creates a standard analysis test suite (most common pattern)
 * @param {Object} config
 * @param {string} config.module - Module path
 * @param {Object} config.exports - Module exports
 * @param {Function} config.analyzeFn - Analysis function
 * @param {Object} config.expectedFields - Expected return fields
 * @param {Function} [config.createMockInput] - Factory for mock input
 * @param {Array} [config.specificTests] - Additional specific tests
 * 
 * @example
 * createAnalysisTestSuite({
 *   module: 'analyses/tier2/coupling',
 *   exports: { analyzeCoupling },
 *   analyzeFn: analyzeCoupling,
 *   expectedFields: { couplings: 'array', maxCoupling: 'number' },
 *   createMockInput: () => SystemMapBuilder.create().build(),
 *   specificTests: [testBidirectionalCoupling]
 * });
 */
export function createAnalysisTestSuite(config) {
  const {
    module,
    exports,
    analyzeFn,
    expectedFields,
    createMockInput,
    contractOptions = {},
    specificTests = []
  } = config;

  return Core.createTestSuite({
    module,
    exports,
    contracts: ['structure', 'error-handling', 'return-structure'],
    contractOptions: {
      analyzeFn,
      expectedFields,
      createMockInput,
      ...contractOptions
    },
    specificTests
  });
}

/**
 * Creates a standard detector test suite
 * @param {Object} config
 * @param {string} config.module - Module path
 * @param {Function} config.detectorClass - Detector class
 * @param {Function} [config.createMockInput] - Factory for mock input
 * @param {Array} [config.specificTests] - Additional specific tests
 */
export function createDetectorTestSuite(config) {
  const {
    module,
    detectorClass,
    createMockInput,
    specificTests = []
  } = config;

  return Core.createTestSuiteWithPreset('detector', {
    module: { path: module, exports: { [module.split('/').pop()]: detectorClass } },
    contractOptions: {
      detectorClass,
      createMockInput
    },
    specificTests
  });
}

/**
 * Creates a simple utility function test suite
 * @param {Object} config
 * @param {string} config.module - Module path
 * @param {Object} config.exports - Module exports
 * @param {Function} config.fn - Utility function
 * @param {*} [config.expectedSafeResult] - Expected result when passed null
 * @param {Array} [config.specificTests] - Additional specific tests
 */
export function createUtilityTestSuite(config) {
  const {
    module,
    exports,
    fn,
    expectedSafeResult,
    contractOptions = {},
    specificTests = []
  } = config;

  return Core.createTestSuite({
    module,
    exports,
    contracts: ['structure', 'error-handling'],
    contractOptions: {
      testFn: fn,
      expectedSafeResult,
      ...contractOptions
    },
    specificTests
  });
}

/**
 * Default export - unified API
 */
export default {
  // Core
  createTestSuite: Core.createTestSuite,
  createTestSuiteWithPreset: Core.createTestSuiteWithPreset,
  createBatchTestSuites: Core.createBatchTestSuites,
  createFocusedTestSuite: Core.createFocusedTestSuite,
  createSkippedTestSuite: Core.createSkippedTestSuite,
  runTestWithCleanup: Core.runTestWithCleanup,
  validateTestSuiteConfig: Core.validateTestSuiteConfig,

  // Contracts
  createStructureContract: ContractModule.createStructureContract,
  createErrorHandlingContract: ContractModule.createErrorHandlingContract,
  createRuntimeContract: ContractModule.createRuntimeContract,
  createReturnStructureContract: ContractModule.createReturnStructureContract,
  createAsyncContract: ContractModule.createAsyncContract,
  ContractPresets: ContractModule.ContractPresets,

  // Quick-start
  createAnalysisTestSuite,
  createDetectorTestSuite,
  createUtilityTestSuite,

  // Namespaced API
  TestSuiteGenerator
};
