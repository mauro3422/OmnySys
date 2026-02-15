import { describe, it, expect } from 'vitest';
import {
  extractFunctionMetadata,
  extractCycleMetadata
} from '#layer-a/analyses/tier1/function-cycle-classifier/extractors/metadata-extractor.js';

describe('analyses/tier1/function-cycle-classifier/extractors/metadata-extractor.js', () => {
  it('extracts normalized metadata fields from an atom', () => {
    const out = extractFunctionMetadata({ name: 'fn', complexity: 3, isAsync: true });
    expect(out.name).toBe('fn');
    expect(out.complexity).toBe(3);
    expect(out.isAsync).toBe(true);
    expect(out.calls).toEqual([]);
  });

  it('extracts metadata map for functions present in cycle', () => {
    const cycle = ['src/a.js::fnA'];
    const atomsIndex = {
      'src/a.js': { atoms: [{ name: 'fnA', complexity: 2 }] }
    };
    const out = extractCycleMetadata(cycle, atomsIndex);
    expect(out['src/a.js::fnA']).toBeDefined();
  });
});

