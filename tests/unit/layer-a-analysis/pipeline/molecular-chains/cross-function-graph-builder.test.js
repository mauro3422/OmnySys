import { describe, it, expect } from 'vitest';
import CrossFunctionGraphBuilderDefault, { CrossFunctionGraphBuilder } from '#layer-a/pipeline/molecular-chains/cross-function-graph-builder.js';

describe('pipeline/molecular-chains/cross-function-graph-builder.js', () => {
  it('re-exports graph builder compatibility wrapper', () => {
    expect(CrossFunctionGraphBuilder).toBeTypeOf('function');
    expect(CrossFunctionGraphBuilderDefault).toBe(CrossFunctionGraphBuilder);
  });
});
