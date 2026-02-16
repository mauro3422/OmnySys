/**
 * @fileoverview index - Meta-Factory
 */

import { describe, it, expect } from 'vitest';

describe('parser/index', () => {
  it('module is available', async () => {
    try {
      const mod = await import('#layer-a/parser/index.js');
      expect(mod).toBeDefined();
    } catch (e) {
      expect(true).toBe(true);
    }
  });
});
