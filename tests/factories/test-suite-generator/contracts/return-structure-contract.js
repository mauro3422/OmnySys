/**
 * @fileoverview Return Structure Contract - Verifies consistent return object structure
 */

import { describe, it, expect } from 'vitest';

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
