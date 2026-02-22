/**
 * @fileoverview Runtime Contract Factory - Creates runtime contract tests
 */

import { describe, it, expect } from 'vitest';

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
    });
  });
}
