import { describe, it, expect } from 'vitest';
import {
  TypeIndex,
  extractTypeContractConnections,
  filterByConfidence,
  groupByTarget
} from '#layer-a/extractors/metadata/type-contracts/contracts/connection-extractor.js';

describe('extractors/metadata/type-contracts/contracts/connection-extractor.js', () => {
  it('indexes atoms by return type and finds compatibles', () => {
    const index = new TypeIndex();
    index.add({ id: 'a1', typeContracts: { returns: { type: 'Array<string>' } } });
    const matches = index.findCompatible('Array<string>');
    expect(matches.length).toBe(1);
  });

  it('extracts type-contract connections between source and target atoms', () => {
    const atoms = [
      {
        id: 'source',
        typeContracts: {
          returns: { type: 'string' },
          signature: '( ) => string'
        }
      },
      {
        id: 'target',
        typeContracts: {
          params: [{ name: 'value', type: 'string' }],
          signature: '(value: string) => void'
        }
      }
    ];
    const out = extractTypeContractConnections(atoms);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].type).toBe('type-contract');
  });

  it('supports filtering and grouping of extracted connections', () => {
    const base = [
      { to: 'a', confidence: 0.2 },
      { to: 'a', confidence: 0.9 },
      { to: 'b', confidence: 0.8 }
    ];
    const filtered = filterByConfidence(base, 0.5);
    expect(filtered.length).toBe(2);
    const grouped = groupByTarget(filtered);
    expect(grouped.get('a').length).toBe(1);
    expect(grouped.get('b').length).toBe(1);
  });
});

