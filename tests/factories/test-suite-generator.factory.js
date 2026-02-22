/**
 * @fileoverview Test Suite Generator Factory (Barrel Export - DEPRECATED)
 *
 * This file re-exports from the new modular factories directory.
 * Please update your imports to use the new structure:
 *
 * Before:
 *   import { createTestSuite } from './test-suite-generator.factory.js';
 *
 * After:
 *   import { createTestSuite } from './test-suite-generator/factories/index.js';
 *   or
 *   import { createTestSuite } from './test-suite-generator/factories/test-suite-factory.js';
 *
 * @deprecated Use ./test-suite-generator/factories/index.js or specific factory modules
 * @module test-suite-generator/factory-deprecated
 */

export {
  createTestSuite,
  createStructureContract,
  createErrorHandlingContract,
  createRuntimeContract
} from './test-suite-generator/factories/index.js';

// Re-export from other modules
export { ContractPresets } from './test-suite-generator/contracts/index.js';
export { TestSuiteBuilder } from './test-suite-generator/test-suite-builders.js';
