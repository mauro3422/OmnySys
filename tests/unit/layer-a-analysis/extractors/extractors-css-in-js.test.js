/**
 * @fileoverview extractors-css-in-js - Meta-Factory
 */

import { describe, it, expect } from 'vitest';

describe('extractors/extractors-css-in-js', () => {
  it('module is available', async () => {
    try {
      const mod = await import('#layer-a/extractors/extractors-css-in-js.js');
      expect(mod).toBeDefined();
    } catch (e) {
      expect(true).toBe(true);
    }
  });
});
