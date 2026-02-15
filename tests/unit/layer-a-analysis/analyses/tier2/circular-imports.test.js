import { describe, it, expect } from 'vitest';
import * as circular from '#layer-a/analyses/tier2/circular-imports.js';

describe('analyses/tier2/circular-imports.js', () => {
  it('re-exports circular import API from cycle-classifier', () => {
    expect(circular.findCircularImports).toBeTypeOf('function');
    expect(circular.classifyCycle).toBeTypeOf('function');
  });
});

