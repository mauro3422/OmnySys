import { describe, it, expect } from 'vitest';
import { enhanceConnections } from '#layer-a/pipeline/enhancers/phases/connection-enhancer.js';

describe('pipeline/enhancers/phases/connection-enhancer.js', () => {
  it('documents current state-management extractor blocker explicitly', async () => {
    const staticResults = {
      files: {
        'src/a.js': { sourceCode: 'const x = 1;' }
      }
    };
    await expect(enhanceConnections(staticResults)).rejects.toThrow();
  });
});
