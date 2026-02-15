import { describe, it, expect } from 'vitest';
import { analyzeDataFlow } from '#layer-a/pipeline/molecular-chains/argument-mapper/analysis/data-flow.js';

describe('pipeline/molecular-chains/argument-mapper/analysis/data-flow.js', () => {
  it('builds comprehensive analysis with summary flags', () => {
    const caller = {
      name: 'caller',
      code: 'const out = callee(a);\nuse(out);',
      dataFlow: { transformations: [{ type: 'map', to: 'source' }] }
    };
    const callee = {
      name: 'callee',
      dataFlow: { outputs: [{ type: 'return', shape: 'number' }] }
    };
    const callInfo = { line: 1, callee: 'callee' };
    const mapFn = () => ({
      caller: 'caller',
      callee: 'callee',
      mappings: [
        {
          argument: { variable: 'source' },
          transform: { type: 'PROPERTY_ACCESS' }
        }
      ],
      callSite: 1,
      totalArgs: 1,
      totalParams: 1
    });

    const result = analyzeDataFlow(caller, callee, callInfo, mapFn);

    expect(result).toHaveProperty('returnUsage');
    expect(result).toHaveProperty('chainedTransforms');
    expect(result.summary.hasDataTransformation).toBe(true);
    expect(result.summary.hasReturnUsage).toBeTypeOf('boolean');
    expect(result.summary.chainComplexity).toBeGreaterThanOrEqual(0);
  });

  it('marks no transformation for direct pass mappings', () => {
    const result = analyzeDataFlow(
      { name: 'a', code: '' },
      { name: 'b', dataFlow: { outputs: [] } },
      { line: 1, callee: 'b' },
      () => ({
        mappings: [{ transform: { type: 'DIRECT_PASS' } }]
      })
    );

    expect(result.summary.hasDataTransformation).toBe(false);
  });
});

