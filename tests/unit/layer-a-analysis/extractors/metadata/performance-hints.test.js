import { describe, it, expect } from 'vitest';
import { extractPerformanceHints } from '#layer-a/extractors/metadata/performance-hints.js';

describe('extractors/metadata/performance-hints.js', () => {
  it('detects nested loops, blocking ops and complexity estimate', () => {
    const code = `
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          const r = new RegExp("x");
        }
      }
      readFileSync("x");
      arr.map(x => x).filter(Boolean);
    `;
    const hints = extractPerformanceHints(code);
    expect(hints.nestedLoops.length).toBeGreaterThan(0);
    expect(hints.blockingOperations.length).toBeGreaterThan(0);
    expect(['O(n)', 'O(n^2)', 'O(n^3)']).toContain(hints.estimatedComplexity);
    expect(Array.isArray(hints.all)).toBe(true);
  });
});

