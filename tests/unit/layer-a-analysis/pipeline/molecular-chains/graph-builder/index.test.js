import { describe, it, expect } from 'vitest';
import {
  GraphBuilder,
  buildNodes,
  determineNodeType,
  determinePositionInChains,
  buildEdges,
  determineEdgeType,
  buildReturnEdges,
  findReturnUsage,
  findPaths,
  calculateMetrics,
  calculateCentrality
} from '#layer-a/pipeline/molecular-chains/graph-builder/index.js';

describe('pipeline/molecular-chains/graph-builder/index.js', () => {
  it('exports graph-builder API', () => {
    expect(GraphBuilder).toBeTypeOf('function');
    expect(buildNodes).toBeTypeOf('function');
    expect(determineNodeType).toBeTypeOf('function');
    expect(determinePositionInChains).toBeTypeOf('function');
    expect(buildEdges).toBeTypeOf('function');
    expect(determineEdgeType).toBeTypeOf('function');
    expect(buildReturnEdges).toBeTypeOf('function');
    expect(findReturnUsage).toBeTypeOf('function');
    expect(findPaths).toBeTypeOf('function');
    expect(calculateMetrics).toBeTypeOf('function');
    expect(calculateCentrality).toBeTypeOf('function');
  });
});
