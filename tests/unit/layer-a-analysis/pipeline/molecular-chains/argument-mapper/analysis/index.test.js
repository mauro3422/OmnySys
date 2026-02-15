import { describe, it, expect } from 'vitest';
import {
  analyzeDataFlow,
  trackReturnUsage,
  detectChainedTransforms,
  calculateChainComplexity
} from '#layer-a/pipeline/molecular-chains/argument-mapper/analysis/index.js';

describe('pipeline/molecular-chains/argument-mapper/analysis/index.js', () => {
  it('exports analysis functions', () => {
    expect(analyzeDataFlow).toBeTypeOf('function');
    expect(trackReturnUsage).toBeTypeOf('function');
    expect(detectChainedTransforms).toBeTypeOf('function');
    expect(calculateChainComplexity).toBeTypeOf('function');
  });

  it('runs minimal data-flow analysis contract', () => {
    const caller = { name: 'caller', code: 'const x = callee(a);', dataFlow: { transformations: [] } };
    const callee = { name: 'callee', dataFlow: { outputs: [{ type: 'return' }] } };
    const result = analyzeDataFlow(caller, callee, { line: 1, callee: 'callee' }, () => ({
      mappings: [{ argument: { variable: 'a' }, transform: { type: 'DIRECT_PASS' } }]
    }));
    expect(result).toHaveProperty('summary');
    expect(result.summary).toHaveProperty('chainComplexity');
  });
});
