/**
 * @fileoverview Core Test Suite Generator
 * 
 * Provides the main functions for generating complete test suites.
 * This is the heart of the Meta-Factory pattern.
 * 
 * @module tests/factories/test-suite-generator/core
 */

// Re-exportar todo desde los módulos separados
export { createTestSuite } from './test-suite-factory.js';
export { 
  createTestSuiteWithPreset,
  createBatchTestSuites,
  createFocusedTestSuite,
  createSkippedTestSuite
} from './test-suite-builders.js';
export { 
  runTestWithCleanup, 
  validateTestSuiteConfig 
} from './test-helpers.js';
export { applyContract } from './contract-applier.js';
