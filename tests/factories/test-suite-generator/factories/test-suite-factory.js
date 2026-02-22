/**
 * @fileoverview Test Suite Factory - Creates complete test suites with standard contracts
 */

import { describe, beforeEach } from 'vitest';
import { createStructureContract } from './structure-contract-factory.js';
import { createErrorHandlingContract } from './error-handling-contract-factory.js';
import { createRuntimeContract } from './runtime-contract-factory.js';

/**
 * Creates a complete test suite with standard contracts
 * @param {Object} config - Configuration for the test suite
 * @param {string} config.module - Module path (e.g., 'analyses/tier2/coupling')
 * @param {string} config.name - Display name for the test suite
 * @param {Function} config.importFn - Async function that imports the module
 * @param {string[]} [config.contracts=['structure', 'error-handling']] - Contracts to include
 * @param {string[]} [config.expectedExports=[]] - Expected named exports
 * @param {string[]} [config.structureFields=[]] - Expected fields in return objects
 * @param {boolean} [config.isAsync=false] - Whether functions return promises
 * @param {Array<{name: string, fn: Function}>} [config.specificTests=[]] - Specific tests to add
 * @param {Object} [config.testData] - Data for testing (created via factories)
 */
export function createTestSuite(config) {
  const {
    module: modulePath,
    name = modulePath,
    importFn,
    contracts = ['structure', 'error-handling'],
    expectedExports = [],
    structureFields = [],
    isAsync = false,
    specificTests = [],
    testData = null
  } = config;

  describe(`${name}`, () => {
    let module;

    beforeEach(async () => {
      if (importFn) {
        module = await importFn();
      }
    });

    // Apply requested contracts
    if (contracts.includes('structure')) {
      createStructureContract({
        modulePath,
        name,
        expectedExports,
        importFn
      });
    }

    if (contracts.includes('error-handling')) {
      createErrorHandlingContract({
        name,
        module,
        testData,
        isAsync
      });
    }

    if (contracts.includes('runtime')) {
      createRuntimeContract({
        modulePath,
        name,
        importFn
      });
    }

    // Add specific tests
    if (specificTests.length > 0) {
      describe('Specific Behavior', () => {
        specificTests.forEach(test => {
          it(test.name, async () => {
            await test.fn({ module, testData, expect });
          });
        });
      });
    }
  });
}
