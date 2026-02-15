import { describe, it, expect } from 'vitest';
import ArgumentMapperDefault, {
  ArgumentMapper,
  TransformType,
  detectTransform,
  extractArgumentCode,
  extractRootVariable,
  analyzeDataFlow,
  trackReturnUsage,
  detectChainedTransforms,
  calculateChainComplexity,
  calculateConfidence,
  findVariableUsages,
  escapeRegex
} from '#layer-a/pipeline/molecular-chains/argument-mapper/index.js';

describe('pipeline/molecular-chains/argument-mapper/index.js', () => {
  it('exports argument-mapper API surface', () => {
    expect(ArgumentMapper).toBeTypeOf('function');
    expect(TransformType).toBeTypeOf('object');
    expect(detectTransform).toBeTypeOf('function');
    expect(extractArgumentCode).toBeTypeOf('function');
    expect(extractRootVariable).toBeTypeOf('function');
    expect(analyzeDataFlow).toBeTypeOf('function');
    expect(trackReturnUsage).toBeTypeOf('function');
    expect(detectChainedTransforms).toBeTypeOf('function');
    expect(calculateChainComplexity).toBeTypeOf('function');
    expect(calculateConfidence).toBeTypeOf('function');
    expect(findVariableUsages).toBeTypeOf('function');
    expect(escapeRegex).toBeTypeOf('function');
    expect(ArgumentMapperDefault).toBe(ArgumentMapper);
  });
});
