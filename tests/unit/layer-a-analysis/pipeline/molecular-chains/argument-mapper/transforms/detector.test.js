import { describe, it, expect } from 'vitest';
import { detectTransform } from '#layer-a/pipeline/molecular-chains/argument-mapper/transforms/detector.js';
import { TransformType } from '#layer-a/pipeline/molecular-chains/argument-mapper/transforms/types.js';

describe('pipeline/molecular-chains/argument-mapper/transforms/detector.js', () => {
  it('detects property access transform', () => {
    const result = detectTransform(
      { type: 'MemberExpression', object: { name: 'order' }, property: { name: 'items' } },
      { name: 'items' }
    );
    expect(result.type).toBe(TransformType.PROPERTY_ACCESS);
  });

  it('detects direct pass, call result, literal and spread transforms', () => {
    expect(detectTransform({ name: 'a' }, { name: 'a' }).type).toBe(TransformType.DIRECT_PASS);
    expect(detectTransform({ type: 'CallExpression', callee: 'fn' }, { name: 'x' }).type).toBe(TransformType.CALL_RESULT);
    expect(detectTransform({ type: 'Literal', value: 42 }, { name: 'x' }).type).toBe(TransformType.LITERAL);
    expect(detectTransform({ type: 'SpreadElement', argument: { name: 'rest' } }, { name: 'x' }).type).toBe(TransformType.SPREAD);
  });

  it('falls back to UNKNOWN for unsupported inputs', () => {
    const result = detectTransform({ type: 'BinaryExpression' }, { name: 'p' });
    expect(result.type).toBe(TransformType.UNKNOWN);
  });
});

