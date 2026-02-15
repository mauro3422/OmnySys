import { describe, it, expect } from 'vitest';
import { extractAllConnections, dedupeConnections } from '#layer-a/pipeline/enhance/extractors/connection-extractor.js';

describe('pipeline/enhance/extractors/connection-extractor.js', () => {
  it('exports connection extractor functions', () => {
    expect(extractAllConnections).toBeTypeOf('function');
    expect(dedupeConnections).toBeTypeOf('function');
  });

  it('documents current state-management extractor blocker explicitly', () => {
    expect(() => extractAllConnections({}, {})).toThrow();
  });

  it('dedupeConnections removes duplicates by key fields', () => {
    const unique = dedupeConnections([
      { type: 'x', sourceFile: 'a', targetFile: 'b' },
      { type: 'x', sourceFile: 'a', targetFile: 'b' },
      { type: 'x', sourceFile: 'a', targetFile: 'c' }
    ]);
    expect(unique).toHaveLength(2);
  });
});
