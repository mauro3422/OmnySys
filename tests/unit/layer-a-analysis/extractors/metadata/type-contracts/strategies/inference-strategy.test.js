import { describe, it, expect } from 'vitest';
import { InferenceStrategy } from '#layer-a/extractors/metadata/type-contracts/strategies/inference-strategy.js';

describe('extractors/metadata/type-contracts/strategies/inference-strategy.js', () => {
  it('infers params and return type from plain JavaScript code', () => {
    const strategy = new InferenceStrategy();
    const out = strategy.extract({
      code: 'function sum(a, b){ return a + b; }'
    });
    expect(out.params.length).toBe(2);
    expect(out.returns).toHaveProperty('type');
  });

  it('canHandle returns true when code exists', () => {
    const strategy = new InferenceStrategy();
    expect(strategy.canHandle({ code: 'const a = 1;' })).toBe(true);
    expect(strategy.calculateConfidence({})).toBe(0.3);
  });
});

