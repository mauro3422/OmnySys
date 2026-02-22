/**
 * @fileoverview Error Handling Contract - Verifies consistent null/undefined handling
 */

import { describe, it, expect } from 'vitest';

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
