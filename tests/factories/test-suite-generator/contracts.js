/**
 * @fileoverview Reusable Contract Tests
 * 
 * Provides standardized contract tests that can be reused across all test suites.
 * Follows SSOT principle - define once, use everywhere.
 * 
 * @module tests/factories/test-suite-generator/contracts
 */

import { describe, it, expect } from 'vitest';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Creates a Structure Contract test suite
 * Verifies that a module exports the expected API
 * 
 * @param {Object} config
 * @param {string} config.moduleName - Name of the module being tested
 * @param {Object} config.exports - Object with expected exports
 * @param {string[]} config.exportNames - Array of expected export names
 */
export function createStructureContract({ moduleName, exports, exportNames = [] }) {
  describe('Structure Contract', () => {
    it(`MUST export required API from ${moduleName}`, () => {
      expect(exports).toBeDefined();
      expect(typeof exports).toBe('object');
    });

    for (const exportName of exportNames) {
      it(`MUST export "${exportName}"`, () => {
        expect(exports[exportName]).toBeDefined();
      });
    }
  });
}

/**
 * Creates an Error Handling Contract test suite
 * Verifies consistent null/undefined handling
 * 
 * @param {Object} config
 * @param {string} config.moduleName - Name of the module being tested
 * @param {Function} config.testFn - Function to test
 * @param {Object} config.options
 * @param {boolean} config.options.async - Whether the function is async
 * @param {*} config.options.expectedSafeResult - Expected result when passed null
 */
export function createErrorHandlingContract({ 
  moduleName, 
  testFn, 
  options = {} 
}) {
  const { async = false, expectedSafeResult } = options;

  describe('Error Handling Contract', () => {
    if (async) {
      it('MUST handle null input gracefully (async)', async () => {
        await expect(testFn(null)).resolves.not.toThrow();
      });

      it('MUST handle undefined input gracefully (async)', async () => {
        await expect(testFn(undefined)).resolves.not.toThrow();
      });

      if (expectedSafeResult !== undefined) {
        it('MUST return safe defaults on null input (async)', async () => {
          const result = await testFn(null);
          expect(result).toEqual(expectedSafeResult);
        });
      }
    } else {
      it('MUST handle null input gracefully', () => {
        expect(() => testFn(null)).not.toThrow();
      });

      it('MUST handle undefined input gracefully', () => {
        expect(() => testFn(undefined)).not.toThrow();
      });

      if (expectedSafeResult !== undefined) {
        it('MUST return safe defaults on null input', () => {
          const result = testFn(null);
          expect(result).toEqual(expectedSafeResult);
        });
      }
    }
  });
}

/**
 * Creates a Runtime Contract test suite
 * Verifies module can be imported without errors
 * 
 * @param {Object} config
 * @param {string} config.modulePath - Path to module (relative to src/layer-a-static)
 * @param {string} [config.expectedError] - Expected error message if module should fail
 */
export function createRuntimeContract({ modulePath, expectedError }) {
  const fullPath = path.resolve('src/layer-a-static', modulePath);

  describe('Runtime Contract', () => {
    it(`MUST load without runtime errors: ${modulePath}`, async () => {
      if (expectedError) {
        await expect(import(pathToFileURL(fullPath).href))
          .rejects
          .toThrow(expectedError);
      } else {
        const mod = await import(pathToFileURL(fullPath).href);
        expect(mod).toBeDefined();
        expect(typeof mod).toBe('object');
      }
    });
  });
}

/**
 * Creates a Return Structure Contract
 * Verifies consistent return object structure
 * 
 * @param {Object} config
 * @param {string} config.moduleName - Name of the module
 * @param {Function} config.testFn - Function to test
 * @param {Object} config.expectedStructure - Expected structure with types
 * @param {Function} config.createValidInput - Factory function for valid input
 */
export function createReturnStructureContract({
  moduleName,
  testFn,
  expectedStructure,
  createValidInput
}) {
  describe('Return Structure Contract', () => {
    it(`MUST return an object`, async () => {
      const input = createValidInput ? createValidInput() : {};
      const result = await testFn(input);
      expect(result).toBeTypeOf('object');
    });

    for (const [field, type] of Object.entries(expectedStructure)) {
      it(`MUST return object with "${field}" property (${type})`, async () => {
        const input = createValidInput ? createValidInput() : {};
        const result = await testFn(input);
        
        expect(result).toHaveProperty(field);
        
        if (type === 'array') {
          expect(Array.isArray(result[field])).toBe(true);
        } else if (type === 'object') {
          expect(typeof result[field]).toBe('object');
          expect(result[field]).not.toBeNull();
        } else {
          expect(typeof result[field]).toBe(type);
        }
      });
    }
  });
}

/**
 * Creates an Async Behavior Contract
 * Verifies async functions behave consistently
 * 
 * @param {Object} config
 * @param {string} config.moduleName - Name of the module
 * @param {Function} config.asyncFn - Async function to test
 */
export function createAsyncContract({ moduleName, asyncFn }) {
  describe('Async Behavior Contract', () => {
    it('MUST return a Promise', () => {
      const result = asyncFn();
      expect(result).toBeInstanceOf(Promise);
    });

    it('MUST resolve (not hang indefinitely)', async () => {
      await expect(asyncFn()).resolves.toBeDefined();
    }, 5000); // 5 second timeout
  });
}

/**
 * Predefined contract combinations for common patterns
 */
export const ContractPresets = {
  /**
   * Standard analysis function preset
   * Includes: Structure, Error Handling, Return Structure
   */
  analysis: ({ moduleName, analyzeFn, expectedFields, createMockInput }) => ({
    structure: (exports) => createStructureContract({ moduleName, exports, exportNames: [moduleName.split('/').pop()] }),
    errorHandling: () => createErrorHandlingContract({ 
      moduleName, 
      testFn: analyzeFn, 
      options: { async: true, expectedSafeResult: { total: 0 } }
    }),
    returnStructure: () => createReturnStructureContract({
      moduleName,
      testFn: analyzeFn,
      expectedStructure: { total: 'number', ...expectedFields },
      createValidInput: createMockInput
    })
  }),

  /**
   * Standard detector preset
   * Includes: Structure, Error Handling, Return Structure with findings
   */
  detector: ({ moduleName, detectorClass, createMockInput }) => ({
    structure: () => createStructureContract({ 
      moduleName, 
      exports: detectorClass, 
      exportNames: ['detect'] 
    }),
    errorHandling: () => createErrorHandlingContract({ 
      moduleName, 
      testFn: (input) => {
        const detector = new detectorClass();
        return detector.detect(input);
      },
      options: { async: true, expectedSafeResult: [] }
    }),
    returnStructure: () => createReturnStructureContract({
      moduleName,
      testFn: async (input) => {
        const detector = new detectorClass();
        return detector.detect(input);
      },
      expectedStructure: { /* findings array */ },
      createValidInput: createMockInput
    })
  }),

  /**
   * Simple utility function preset
   */
  utility: ({ moduleName, fn, expectedSafeResult }) => ({
    structure: (exports) => createStructureContract({ moduleName, exports }),
    errorHandling: () => createErrorHandlingContract({ 
      moduleName, 
      testFn: fn,
      options: { expectedSafeResult }
    })
  })
};
