import { describe, it, expect } from 'vitest';
import * as enhancers from '#layer-a/pipeline/enhancers/index.js';

describe('pipeline/enhancers/index.js', () => {
  it('exports orchestrators, builders, analyzers and legacy compat layer', () => {
    expect(enhancers.runEnhancers).toBeTypeOf('function');
    expect(enhancers.runProjectEnhancers).toBeTypeOf('function');
    expect(enhancers.buildSourceCodeMap).toBeTypeOf('function');
    expect(enhancers.collectSemanticIssues).toBeTypeOf('function');
    expect(enhancers.enhanceSystemMap).toBeTypeOf('function');
    expect(enhancers.enrichSystemMap).toBeTypeOf('function');
    expect(enhancers.enrichConnections).toBeTypeOf('function');
    expect(enhancers.enhanceMetadata).toBeTypeOf('function');
  });
});
