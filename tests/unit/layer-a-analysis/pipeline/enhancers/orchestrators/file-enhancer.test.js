import { describe, it, expect } from 'vitest';
import { runEnhancers } from '#layer-a/pipeline/enhancers/orchestrators/file-enhancer.js';

describe('File Enhancer (real modules)', () => {
  it('returns original context when there are no atoms', async () => {
    const context = { atoms: [], filePath: 'test.js' };
    const result = await runEnhancers(context);
    expect(result).toBe(context);
  });

  it('enriches atom metadata without mocks when atoms are provided', async () => {
    const context = {
      atoms: [{ id: 'a1', complexity: 3, linesOfCode: 10, calls: [], calledBy: [] }],
      filePath: 'src/a.js'
    };

    const result = await runEnhancers(context);
    expect(result.atoms[0]).toHaveProperty('metrics');
    expect(result.atoms[0].metrics).toHaveProperty('normalizedComplexity');
  });
});
