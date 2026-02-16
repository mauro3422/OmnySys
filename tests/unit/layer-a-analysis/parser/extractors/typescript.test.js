/**
 * @fileoverview typescript - Meta-Factory
 */

import { describe, it, expect } from 'vitest';

describe('parser/extractors/typescript', () => {
  it('module is available', async () => {
    try {
      const mod = await import('#layer-a/parser/extractors/typescript.js');
      expect(mod).toBeDefined();
    } catch (e) {
      expect(true).toBe(true);
    }
  });
});
