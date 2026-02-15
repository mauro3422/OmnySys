import { describe, it, expect } from 'vitest';
import {
  buildNodes,
  determineNodeType,
  determinePositionInChains
} from '#layer-a/pipeline/molecular-chains/graph-builder/nodes/index.js';

describe('pipeline/molecular-chains/graph-builder/nodes/index.js', () => {
  it('exports node helpers', () => {
    expect(buildNodes).toBeTypeOf('function');
    expect(determineNodeType).toBeTypeOf('function');
    expect(determinePositionInChains).toBeTypeOf('function');
  });
});
