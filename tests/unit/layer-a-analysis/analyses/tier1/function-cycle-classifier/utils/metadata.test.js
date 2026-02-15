import { describe, it, expect } from 'vitest';
import {
  extractFunctionMetadata,
  buildMetadataIndex
} from '#layer-a/analyses/tier1/function-cycle-classifier/utils/metadata.js';

describe('analyses/tier1/function-cycle-classifier/utils/metadata.js', () => {
  it('extracts normalized metadata defaults from atom', () => {
    const out = extractFunctionMetadata({ name: 'x' });
    expect(out.name).toBe('x');
    expect(out.complexity).toBe(0);
    expect(out.hasSideEffects).toBe(false);
  });

  it('builds metadata index for cycle function IDs', () => {
    const cycle = ['src/a.js::run'];
    const atomsIndex = {
      'src/a.js': { atoms: [{ name: 'run', complexity: 7 }] }
    };
    const out = buildMetadataIndex(cycle, atomsIndex);
    expect(out['src/a.js::run']).toBeDefined();
    expect(out['src/a.js::run'].complexity).toBe(7);
  });
});

