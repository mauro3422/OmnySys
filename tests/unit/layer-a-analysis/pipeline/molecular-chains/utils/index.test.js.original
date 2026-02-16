import { describe, it, expect } from 'vitest';
import { isValidChainNode, getUniqueFunctions } from '#layer-a/pipeline/molecular-chains/utils/index.js';

describe('pipeline/molecular-chains/utils/index.js', () => {
  it('validates chain nodes', () => {
    expect(isValidChainNode({ id: 'a', name: 'fn' })).toBe(true);
    expect(isValidChainNode({ id: 'a' })).toBe(false);
  });

  it('collects unique functions from chain steps', () => {
    const unique = getUniqueFunctions([
      { steps: [{ function: 'a' }, { function: 'b' }] },
      { steps: [{ function: 'a' }] }
    ]);
    expect(unique.has('a')).toBe(true);
    expect(unique.has('b')).toBe(true);
    expect(unique.size).toBe(2);
  });
});
