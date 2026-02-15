import { describe, it, expect } from 'vitest';
import {
  enhanceSystemMap,
  enrichSystemMap
} from '#layer-a/pipeline/enhancers/legacy/index.js';

describe('pipeline/enhancers/legacy/index.js', () => {
  it('exports backward-compatible system map enhancers', () => {
    expect(enhanceSystemMap).toBeTypeOf('function');
    expect(enrichSystemMap).toBeTypeOf('function');
  });
});
