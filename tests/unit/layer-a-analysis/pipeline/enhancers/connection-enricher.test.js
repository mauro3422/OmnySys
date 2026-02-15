import { describe, it, expect } from 'vitest';
import { enrichConnections } from '#layer-a/pipeline/enhancers/connection-enricher.js';

describe('Connection Enricher (real modules)', () => {
  it('returns normalized structure for empty atom list', async () => {
    const result = await enrichConnections([]);
    expect(result).toHaveProperty('connections');
    expect(result).toHaveProperty('conflicts');
    expect(result).toHaveProperty('stats');
    expect(Array.isArray(result.connections)).toBe(true);
    expect(Array.isArray(result.conflicts)).toBe(true);
  });

  it('returns stats counters for non-empty atom list', async () => {
    const atoms = [{
      id: 'atom-1',
      name: 'fn1',
      filePath: 'src/a.js',
      dataFlow: { inputs: [], outputs: [] },
      temporal: { patterns: {} },
      calls: [],
      calledBy: []
    }];

    const result = await enrichConnections(atoms, { verbose: false });
    expect(result.stats).toHaveProperty('temporal');
    expect(result.stats).toHaveProperty('crossFileTemporal');
    expect(result.stats).toHaveProperty('dataFlow');
    expect(result.stats).toHaveProperty('inherited');
    expect(result.stats).toHaveProperty('conflicts');
  });
});
