/**
 * @fileoverview Structure Contract Factory - Creates structure contract tests
 */

import { describe, it, expect } from 'vitest';

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
