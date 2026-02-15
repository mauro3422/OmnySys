import { describe, it, expect } from 'vitest';
import {
  findVariableUsages,
  escapeRegex,
  calculateConfidence
} from '#layer-a/pipeline/molecular-chains/argument-mapper/utils/index.js';

describe('pipeline/molecular-chains/argument-mapper/utils/index.js', () => {
  it('exports utility functions', () => {
    expect(findVariableUsages).toBeTypeOf('function');
    expect(escapeRegex).toBeTypeOf('function');
    expect(calculateConfidence).toBeTypeOf('function');
  });

  it('calculates confidence in [0..1] and escapes regex tokens', () => {
    const score = calculateConfidence({ name: 'a', dataType: 'string', type: 'Identifier' }, { name: 'a', dataType: 'string' });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
    expect(escapeRegex('a+b')).toBe('a\\+b');
  });
});
