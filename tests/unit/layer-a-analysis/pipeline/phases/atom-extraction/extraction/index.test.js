import { describe, it, expect } from 'vitest';
import { extractAtoms, extractAtomMetadata } from '#layer-a/pipeline/phases/atom-extraction/extraction/index.js';

describe('pipeline/phases/atom-extraction/extraction/index.js', () => {
  it('exports extraction helpers', () => {
    expect(extractAtoms).toBeTypeOf('function');
    expect(extractAtomMetadata).toBeTypeOf('function');
  });
});
