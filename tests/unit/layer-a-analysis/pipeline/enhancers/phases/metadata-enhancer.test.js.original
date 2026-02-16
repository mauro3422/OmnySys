import { describe, it, expect } from 'vitest';
import { enhanceMetadata } from '#layer-a/pipeline/enhancers/phases/metadata-enhancer.js';

describe('pipeline/enhancers/phases/metadata-enhancer.js', () => {
  it('enhances per-file metrics and flags', () => {
    const staticResults = {
      files: {
        'src/a.js': { imports: [1], exports: [1, 2], usedBy: ['x', 'y', 'z', 'w', 'q', 'r'] }
      }
    };
    enhanceMetadata(staticResults);
    const file = staticResults.files['src/a.js'];
    expect(file.metrics).toHaveProperty('importCount');
    expect(file.flags).toHaveProperty('isEntryPoint');
  });
});
