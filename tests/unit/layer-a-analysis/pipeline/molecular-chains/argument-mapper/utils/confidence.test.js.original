import { describe, it, expect } from 'vitest';
import { calculateConfidence } from '#layer-a/pipeline/molecular-chains/argument-mapper/utils/confidence.js';

describe('pipeline/molecular-chains/argument-mapper/utils/confidence.js', () => {
  it('increases confidence for aligned and explicit mappings', () => {
    const value = calculateConfidence(
      {
        type: 'MemberExpression',
        name: 'items',
        dataType: 'array'
      },
      {
        name: 'items',
        dataType: 'array',
        type: 'simple'
      }
    );

    expect(value).toBeGreaterThan(0.9);
    expect(value).toBeLessThanOrEqual(1);
  });

  it('decreases confidence for spread or destructured params and clamps bounds', () => {
    const low = calculateConfidence(
      { type: 'SpreadElement', name: 'args' },
      { name: 'payload', type: 'destructured' }
    );
    expect(low).toBeGreaterThanOrEqual(0);
    expect(low).toBeLessThan(0.5);
  });
});

