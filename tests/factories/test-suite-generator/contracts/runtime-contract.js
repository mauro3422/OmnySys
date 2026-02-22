/**
 * @fileoverview Runtime Contract - Verifies module can be imported without errors
 */

import { describe, it, expect } from 'vitest';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

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
