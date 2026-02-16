import { describe, it, expect } from 'vitest';
import { determinePositionInChains } from '#layer-a/pipeline/molecular-chains/graph-builder/nodes/position.js';

describe('pipeline/molecular-chains/graph-builder/nodes/position.js', () => {
  it('returns unique chain positions for an atom across chains', () => {
    const atom = { id: 'a2' };
    const chains = [
      { steps: [{ atomId: 'a1' }, { atomId: 'a2' }] },
      { steps: [{ atomId: 'a2' }, { atomId: 'a3' }] },
      { steps: [{ atomId: 'a1' }, { atomId: 'a2' }, { atomId: 'a3' }] }
    ];

    const positions = determinePositionInChains(atom, chains);

    expect(positions).toContain('entry');
    expect(positions).toContain('exit');
    expect(positions).toContain('middle');
    expect(new Set(positions).size).toBe(positions.length);
  });
});

