import { describe, it, expect } from 'vitest';
import { TransformType, detectTransform } from '#layer-a/pipeline/molecular-chains/argument-mapper/transforms/index.js';

describe('pipeline/molecular-chains/argument-mapper/transforms/index.js', () => {
  it('exports transform enum and detector', () => {
    expect(TransformType).toBeTypeOf('object');
    expect(detectTransform).toBeTypeOf('function');
  });

  it('detects direct-pass and property-access transforms', () => {
    const direct = detectTransform({ name: 'user' }, { name: 'user' });
    const property = detectTransform({ type: 'MemberExpression', object: { name: 'order' }, property: 'items' }, { name: 'items' });
    expect(direct.type).toBe(TransformType.DIRECT_PASS);
    expect(property.type).toBe(TransformType.PROPERTY_ACCESS);
  });
});
