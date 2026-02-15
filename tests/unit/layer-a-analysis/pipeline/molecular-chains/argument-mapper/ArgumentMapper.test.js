import { describe, it, expect } from 'vitest';
import { ArgumentMapper } from '#layer-a/pipeline/molecular-chains/argument-mapper/ArgumentMapper.js';

describe('pipeline/molecular-chains/argument-mapper/ArgumentMapper.js', () => {
  it('maps arguments to parameters with summary flags', () => {
    const mapper = new ArgumentMapper(
      { name: 'caller' },
      {
        name: 'callee',
        dataFlow: {
          inputs: [
            { name: 'items', type: 'simple', position: 0 },
            { name: 'rest', type: 'destructured', position: 1 }
          ]
        }
      },
      {
        line: 12,
        args: [
          { type: 'MemberExpression', object: { name: 'order' }, property: { name: 'items' } },
          { type: 'spread', argument: { name: 'args' } }
        ]
      }
    );

    const result = mapper.map();

    expect(result.caller).toBe('caller');
    expect(result.callee).toBe('callee');
    expect(result.callSite).toBe(12);
    expect(result.totalArgs).toBe(2);
    expect(result.totalParams).toBe(2);
    expect(result.hasSpread).toBe(true);
    expect(result.hasDestructuring).toBe(true);
    expect(result.mappings).toHaveLength(2);
  });

  it('maps single argument/parameter with transform and confidence', () => {
    const mapper = new ArgumentMapper(
      { name: 'caller' },
      { name: 'callee', dataFlow: { inputs: [] } },
      { args: [] }
    );

    const mapped = mapper.mapArgumentToParam(
      { name: 'value', type: 'Identifier' },
      { name: 'value', type: 'simple', position: 0 },
      0
    );

    expect(mapped.position).toBe(0);
    expect(mapped.argument.variable).toBe('value');
    expect(mapped.parameter.name).toBe('value');
    expect(mapped.transform).toHaveProperty('type');
    expect(mapped.confidence).toBeGreaterThanOrEqual(0);
    expect(mapped.confidence).toBeLessThanOrEqual(1);
  });

  it('runs analyzeDataFlow end-to-end through instance API', () => {
    const mapper = new ArgumentMapper(
      {
        name: 'caller',
        code: 'const out = callee(v); use(out);',
        dataFlow: { transformations: [{ type: 'map', to: 'v' }] }
      },
      {
        name: 'callee',
        dataFlow: {
          inputs: [{ name: 'v' }],
          outputs: [{ type: 'return' }]
        }
      },
      {
        line: 1,
        callee: 'callee',
        args: [{ name: 'v', type: 'Identifier' }]
      }
    );

    const result = mapper.analyzeDataFlow();
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('returnUsage');
    expect(result).toHaveProperty('chainedTransforms');
  });
});
