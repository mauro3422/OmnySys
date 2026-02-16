import { describe, it, expect } from 'vitest';
import { calculateComplexity } from '#layer-a/pipeline/phases/atom-extraction/metadata/complexity.js';

describe('pipeline/phases/atom-extraction/metadata/complexity.js', () => {
  it('returns base complexity of 1 for linear code', () => {
    expect(calculateComplexity('const x = 1;\nreturn x;')).toBe(1);
  });

  it('increments complexity for control flow patterns', () => {
    const code = `
      if (a) { run(); }
      else if (b) { run2(); }
      for (let i = 0; i < 3; i++) { x++; }
      while (c) { c--; }
      switch (k) { case 1: break; }
      try { f(); } catch (e) { g(); }
      return a && b || c ? 1 : 2;
    `;
    expect(calculateComplexity(code)).toBeGreaterThan(8);
  });
});
