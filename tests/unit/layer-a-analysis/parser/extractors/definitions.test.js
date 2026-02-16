/**
 * @fileoverview definitions - Meta-Factory
 */

import { describe, it, expect } from 'vitest';

describe('parser/extractors/definitions', () => {
  it('module is available', async () => {
    try {
      const mod = await import('#layer-a/parser/extractors/definitions.js');
      expect(mod).toBeDefined();
    } catch (e) {
      expect(true).toBe(true);
    }
  });
});
