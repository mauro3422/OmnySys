/**
 * @fileoverview Error Handling Contract Factory - Creates error handling contract tests
 */

import { describe, it, expect } from 'vitest';

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
