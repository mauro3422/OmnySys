import { describe, it, expect } from 'vitest';
import { calculateStaticComplexity } from '#layer-a/analyses/tier3/factors/StaticComplexity.js';

describe('analyses/tier3/factors/StaticComplexity.js', () => {
  it('assigns static complexity score from file stats', () => {
    expect(calculateStaticComplexity({ functions: Array.from({ length: 20 }, () => ({})) }).score).toBe(3);
    expect(calculateStaticComplexity({ functions: Array.from({ length: 5 }, () => ({})) }).score).toBe(1);
  });
});

