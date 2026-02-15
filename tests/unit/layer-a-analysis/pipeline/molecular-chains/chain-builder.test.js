import { describe, it, expect } from 'vitest';
import ChainBuilderDefault, { ChainBuilder } from '#layer-a/pipeline/molecular-chains/chain-builder.js';

describe('pipeline/molecular-chains/chain-builder.js', () => {
  it('re-exports ChainBuilder compatibility wrapper', () => {
    expect(ChainBuilder).toBeTypeOf('function');
    expect(ChainBuilderDefault).toBe(ChainBuilder);
  });
});
