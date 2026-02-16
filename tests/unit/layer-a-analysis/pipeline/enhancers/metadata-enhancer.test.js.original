import { describe, it, expect } from 'vitest';
import { enhanceMetadata } from '#layer-a/pipeline/enhancers/metadata-enhancer.js';

describe('Metadata Enhancer (real modules)', () => {
  it('adds metrics and temporal summary', async () => {
    const context = {
      atoms: [{
        id: 'atom-1',
        complexity: 10,
        linesOfCode: 20,
        calls: ['a'],
        calledBy: ['b'],
        temporal: { patterns: { initialization: ['init'], lifecycleHooks: [], timers: [], asyncPatterns: {} } }
      }],
      filePath: 'test.js'
    };
    const result = await enhanceMetadata(context);
    expect(result.atoms[0].metrics).toHaveProperty('criticalityScore');
    expect(result.atoms[0].temporal.summary).toBeDefined();
  });

  it('adds lineage validation when dna exists', async () => {
    const context = { atoms: [{ id: 'atom-2', dna: {} }], filePath: 'test.js' };
    const result = await enhanceMetadata(context);
    expect(result.atoms[0]._meta.validation).toHaveProperty('valid');
    expect(result.atoms[0]._meta.validation).toHaveProperty('confidence');
  });

  it('handles empty atoms list', async () => {
    const context = { atoms: [], filePath: 'test.js' };
    const result = await enhanceMetadata(context);
    expect(result.atoms).toEqual([]);
  });
});
