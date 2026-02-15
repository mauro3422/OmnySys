import { describe, it, expect } from 'vitest';
import {
  detectChainedTransforms,
  calculateChainComplexity
} from '#layer-a/pipeline/molecular-chains/argument-mapper/analysis/chains.js';

describe('pipeline/molecular-chains/argument-mapper/analysis/chains.js', () => {
  it('detects chained transforms when argument variable comes from caller transformations', () => {
    const mapping = {
      mappings: [{ argument: { variable: 'normalizedItems' } }]
    };
    const caller = {
      name: 'callerFn',
      dataFlow: { transformations: [{ type: 'map', to: 'normalizedItems' }] }
    };
    const callee = { name: 'calleeFn' };

    const chains = detectChainedTransforms(mapping, caller, callee);

    expect(chains).toHaveLength(1);
    expect(chains[0]).toEqual({
      from: 'callerFn.map',
      to: 'calleeFn.input',
      via: 'normalizedItems'
    });
  });

  it('returns empty array when no mapping variable has a source transform', () => {
    const chains = detectChainedTransforms(
      { mappings: [{ argument: { variable: 'x' } }] },
      { name: 'caller', dataFlow: { transformations: [] } },
      { name: 'callee' }
    );

    expect(chains).toEqual([]);
  });

  it('calculates chain complexity from transforms and return usage', () => {
    const complexity = calculateChainComplexity(
      {
        mappings: [
          { transform: { type: 'DIRECT_PASS' } },
          { transform: { type: 'PROPERTY_ACCESS' } },
          { transform: { type: 'CALL_RESULT' } }
        ]
      },
      { isUsed: true, usages: [{ line: 1 }, { line: 2 }] }
    );

    expect(complexity).toBe(5);
  });
});
