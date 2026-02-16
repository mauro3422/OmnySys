import { describe, it, expect } from 'vitest';
import {
  extractDataFlowConnections,
  generateTypeKey,
  calculateDataFlowConfidence
} from '#layer-a/pipeline/enhancers/connections/dataflow/index.js';

describe('pipeline/enhancers/connections/dataflow/index.js', () => {
  it('exports dataflow extractor helpers', () => {
    expect(extractDataFlowConnections).toBeTypeOf('function');
    expect(generateTypeKey).toBeTypeOf('function');
    expect(calculateDataFlowConfidence).toBeTypeOf('function');
  });

  it('generates deterministic type keys', () => {
    expect(generateTypeKey({ type: 'user' })).toBe('user');
    expect(generateTypeKey({ shape: { id: 'number' } })).toContain('id:number');
  });
});
