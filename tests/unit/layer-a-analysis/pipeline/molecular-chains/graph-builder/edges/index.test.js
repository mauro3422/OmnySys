import { describe, it, expect } from 'vitest';
import {
  buildEdges,
  determineEdgeType,
  buildReturnEdges,
  findReturnUsage
} from '#layer-a/pipeline/molecular-chains/graph-builder/edges/index.js';

describe('pipeline/molecular-chains/graph-builder/edges/index.js', () => {
  it('exports edge helpers', () => {
    expect(buildEdges).toBeTypeOf('function');
    expect(determineEdgeType).toBeTypeOf('function');
    expect(buildReturnEdges).toBeTypeOf('function');
    expect(findReturnUsage).toBeTypeOf('function');
  });
});
