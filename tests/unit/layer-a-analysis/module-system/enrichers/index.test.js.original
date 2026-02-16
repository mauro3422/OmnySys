import { describe, it, expect } from 'vitest';
import { enrichMoleculesWithSystemContext, createEmptyContext } from '../../../../../src/layer-a-static/module-system/enrichers/system-context-enricher.js';

describe('module-system/enrichers/index.js', () => {
  it('re-exports enrichMoleculesWithSystemContext', () => {
    expect(typeof enrichMoleculesWithSystemContext).toBe('function');
  });

  it('re-exports createEmptyContext', () => {
    expect(typeof createEmptyContext).toBe('function');
    expect(createEmptyContext()).toEqual({ moduleContext: null, systemContext: null });
  });
});

