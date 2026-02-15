import { describe, it, expect } from 'vitest';
import * as legacy from '#layer-a/extractors/metadata/error-flow.js';
import { extractErrorFlow as fromIndex } from '#layer-a/extractors/metadata/error-flow/index.js';

describe('extractors/metadata/error-flow.js', () => {
  it('re-exports legacy compatibility API from modular index', () => {
    expect(legacy.extractErrorFlow).toBeTypeOf('function');
    expect(legacy.extractThrows).toBeTypeOf('function');
    expect(legacy.extractCatches).toBeTypeOf('function');
    expect(legacy.detectPropagationPattern).toBeTypeOf('function');
    expect(legacy.default).toBe(fromIndex);
  });
});

