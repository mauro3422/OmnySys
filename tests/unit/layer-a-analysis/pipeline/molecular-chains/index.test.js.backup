import { describe, it, expect } from 'vitest';
import MolecularChainsDefault, {
  ChainBuilder,
  ChainIdGenerator,
  ChainStepBuilder,
  ChainSummaryBuilder,
  isValidChainNode,
  getUniqueFunctions
} from '#layer-a/pipeline/molecular-chains/index.js';

describe('pipeline/molecular-chains/index.js', () => {
  it('exports public API', () => {
    expect(ChainBuilder).toBeTypeOf('function');
    expect(ChainIdGenerator).toBeTypeOf('function');
    expect(ChainStepBuilder).toBeTypeOf('function');
    expect(ChainSummaryBuilder).toBeTypeOf('function');
    expect(isValidChainNode).toBeTypeOf('function');
    expect(getUniqueFunctions).toBeTypeOf('function');
    expect(MolecularChainsDefault).toBe(ChainBuilder);
  });
});
