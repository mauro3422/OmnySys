/**
 * @fileoverview Structure Contract - Verifies module exports expected API
 */

import { describe, it, expect } from 'vitest';

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
