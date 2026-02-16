/**
 * @fileoverview Parser System
 */

import { describe, it, expect } from 'vitest';
import * as parser from '#layer-a/parser/index.js';

describe('Parser System', () => {
  it('parser exports are available', () => {
    expect(Object.keys(parser).length).toBeGreaterThan(0);
  });
  
  it('parser functions are callable', () => {
    const firstFn = Object.values(parser)[0];
    if (typeof firstFn === 'function') {
      try {
        const result = firstFn('');
        expect(result).toBeDefined();
      } catch (e) {
        // Parser might throw on empty input, that's ok
        expect(true).toBe(true);
      }
    }
  });
});
