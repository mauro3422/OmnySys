import { describe, it, expect } from 'vitest';
import { enrichWithDNA } from '#layer-a/pipeline/phases/atom-extraction/builders/enrichment.js';

describe('pipeline/phases/atom-extraction/builders/enrichment.js', () => {
  it('runs enrichment without throwing on minimal atom metadata', () => {
    const atomMetadata = {
      id: 'a1',
      name: 'fn',
      _meta: {}
    };

    expect(() => enrichWithDNA(atomMetadata, 'fn')).not.toThrow();
    expect(atomMetadata).toHaveProperty('_meta');
  });

  it('stores lineage validation only when dna exists', () => {
    const atomMetadata = {
      id: 'a2',
      name: 'fn2',
      filePath: 'src/fn2.js',
      _meta: {}
    };

    enrichWithDNA(atomMetadata, 'fn2');

    if (atomMetadata.dna) {
      expect(atomMetadata._meta.lineageValidation).toHaveProperty('valid');
      expect(atomMetadata._meta.lineageValidation).toHaveProperty('confidence');
    } else {
      expect(atomMetadata._meta.lineageValidation).toBeUndefined();
    }
  });
});

