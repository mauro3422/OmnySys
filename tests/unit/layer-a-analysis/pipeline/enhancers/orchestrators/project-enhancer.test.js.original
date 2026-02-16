import { describe, it, expect } from 'vitest';
import { runProjectEnhancers } from '#layer-a/pipeline/enhancers/orchestrators/project-enhancer.js';

describe('Project Enhancer (real modules)', () => {
  it('returns connections and runtime metadata', async () => {
    const result = await runProjectEnhancers([], { totalFiles: 0 });
    expect(result).toHaveProperty('connections');
    expect(result).toHaveProperty('metadata');
    expect(result.metadata.atomCount).toBe(0);
  });

  it('includes enriched timestamp and duration', async () => {
    const atoms = [
      { id: 'a1', dataFlow: { inputs: [], outputs: [] }, calls: [], calledBy: [] }
    ];
    const result = await runProjectEnhancers(atoms, { totalFiles: 1 });
    expect(result.metadata.enhancedAt).toBeTypeOf('string');
    expect(result.metadata.duration).toBeTypeOf('number');
    expect(result.connections).toHaveProperty('connections');
    expect(result.connections).toHaveProperty('conflicts');
    expect(result.connections).toHaveProperty('stats');
  });
});
