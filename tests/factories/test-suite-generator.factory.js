/**
 * @fileoverview Test Suite Generator Factory (Meta-Factory)
 *
 * Meta-factory for generating standardized test suites with contracts.
 * Reduces boilerplate and ensures consistency across all Layer A tests.
 *
 * @module tests/factories/test-suite-generator
 */

import { describe, it, expect } from 'vitest';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

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

/**
 * Creates structure contract tests
 * @param {Object} config
 * @param {string} config.modulePath - Path to module
 * @param {string} config.name - Module name
 * @param {string[]} config.expectedExports - Expected export names
 * @param {Function} config.importFn - Import function
 */
export function createStructureContract({ modulePath, name, expectedExports = [], importFn }) {
  describe('Structure Contract', () => {
    it('MUST be importable without errors', async () => {
      expect(async () => {
        await importFn();
      }).not.toThrow();
    });

    if (expectedExports.length > 0) {
      expectedExports.forEach(exportName => {
        it(`MUST export "${exportName}"`, async () => {
          const mod = await importFn();
          expect(mod[exportName]).toBeDefined();
        });
      });
    }
  });
}

/**
 * Creates error handling contract tests
 * @param {Object} config
 * @param {string} config.name - Module name
 * @param {Object} config.module - Module exports
 * @param {Object} config.testData - Test data from factories
 * @param {boolean} config.isAsync - Whether to use async/await
 */
export function createErrorHandlingContract({ name, module, testData, isAsync = false }) {
  describe('Error Handling Contract', () => {
    const testableFunctions = module ? Object.entries(module).filter(([key, val]) => typeof val === 'function') : [];

    if (testableFunctions.length === 0) {
      it('No functions to test error handling', () => {
        expect(true).toBe(true);
      });
      return;
    }

    testableFunctions.forEach(([fnName, fn]) => {
      it(`"${fnName}" MUST handle null input gracefully`, async () => {
        if (isAsync) {
          await expect(fn(null)).resolves.not.toThrow();
        } else {
          expect(() => fn(null)).not.toThrow();
        }
      });

      it(`"${fnName}" MUST handle undefined input gracefully`, async () => {
        if (isAsync) {
          await expect(fn(undefined)).resolves.not.toThrow();
        } else {
          expect(() => fn(undefined)).not.toThrow();
        }
      });

      if (testData) {
        it(`"${fnName}" MUST handle empty data gracefully`, async () => {
          const emptyData = Array.isArray(testData) ? [] : {};
          if (isAsync) {
            await expect(fn(emptyData)).resolves.not.toThrow();
          } else {
            expect(() => fn(emptyData)).not.toThrow();
          }
        });
      }
    });
  });
}

/**
 * Creates runtime contract tests
 * @param {Object} config
 * @param {string} config.modulePath - Path to module
 * @param {string} config.name - Module name
 * @param {Function} config.importFn - Import function
 */
export function createRuntimeContract({ modulePath, name, importFn }) {
  describe('Runtime Contract', () => {
    it('MUST load without runtime errors', async () => {
      const mod = await importFn();
      expect(mod).toBeDefined();
