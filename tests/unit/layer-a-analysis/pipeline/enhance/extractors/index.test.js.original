import { describe, it, expect } from 'vitest';
import {
  extractAllConnections,
  dedupeConnections
} from '#layer-a/pipeline/enhance/extractors/index.js';

describe('pipeline/enhance/extractors/index.js', () => {
  it('exports extractor contract', () => {
    expect(extractAllConnections).toBeTypeOf('function');
    expect(dedupeConnections).toBeTypeOf('function');
  });

  it('dedupeConnections removes duplicates while preserving unique links', () => {
    const deduped = dedupeConnections([
      { type: 'event', sourceFile: 'a', targetFile: 'b', eventName: 'x' },
      { type: 'event', sourceFile: 'a', targetFile: 'b', eventName: 'x' },
      { type: 'event', sourceFile: 'a', targetFile: 'c', eventName: 'x' }
    ]);

    expect(deduped).toHaveLength(2);
  });
});
