/**
 * @fileoverview Async Contract - Verifies async functions behave consistently
 */

import { describe, it, expect } from 'vitest';

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
