import { describe, it, expect } from 'vitest';
import { JSDocStrategy } from '#layer-a/extractors/metadata/type-contracts/strategies/jsdoc-strategy.js';

describe('extractors/metadata/type-contracts/strategies/jsdoc-strategy.js', () => {
  it('extracts params/returns/throws from JSDoc metadata', () => {
    const strategy = new JSDocStrategy();
    const out = strategy.extract({
      jsdoc: {
        params: [{ name: 'count', type: 'number' }],
        returns: { type: 'string' },
        throws: [{ type: 'Error', description: 'if invalid input' }]
      }
    });
    expect(out.params.length).toBe(1);
    expect(out.returns.type).toBe('string');
    expect(out.throws.length).toBe(1);
  });

  it('detects strategy applicability and computes confidence', () => {
    const strategy = new JSDocStrategy();
    expect(strategy.canHandle({ jsdoc: { params: [] } })).toBeTruthy();
    expect(strategy.calculateConfidence({ params: [{ name: 'x' }], returns: { type: 'number' } })).toBeGreaterThan(0.5);
  });
});
