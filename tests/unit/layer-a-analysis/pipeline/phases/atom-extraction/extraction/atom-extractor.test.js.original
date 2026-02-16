import { describe, it, expect } from 'vitest';
import {
  extractAtoms,
  extractAtomMetadata
} from '#layer-a/pipeline/phases/atom-extraction/extraction/atom-extractor.js';

describe('pipeline/phases/atom-extraction/extraction/atom-extractor.js', () => {
  it('returns empty list when file has no functions', async () => {
    const result = await extractAtoms({ functions: [] }, '', {}, 'src/empty.js');
    expect(result).toEqual([]);
  });

  it('extracts atom metadata for a simple function', async () => {
    const functionInfo = {
      id: 'f1',
      name: 'sum',
      line: 1,
      endLine: 3,
      isExported: false,
      calls: [],
      node: null
    };
    const functionCode = 'function sum(a,b){ return a+b; }';

    const atom = await extractAtomMetadata(functionInfo, functionCode, { jsdoc: '' }, 'src/sum.js');

    expect(atom.id).toBe('f1');
    expect(atom.name).toBe('sum');
    expect(atom.filePath).toBe('src/sum.js');
    expect(atom).toHaveProperty('archetype');
    expect(atom).toHaveProperty('complexity');
  });
});

