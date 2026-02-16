import { describe, it, expect } from 'vitest';
import TransformTypeDefault, { TransformType } from '#layer-a/pipeline/molecular-chains/argument-mapper/transforms/types.js';

describe('pipeline/molecular-chains/argument-mapper/transforms/types.js', () => {
  it('exports transform enum with expected keys', () => {
    expect(TransformType).toHaveProperty('PROPERTY_ACCESS');
    expect(TransformType).toHaveProperty('DIRECT_PASS');
    expect(TransformType).toHaveProperty('CALL_RESULT');
    expect(TransformType).toHaveProperty('LITERAL');
    expect(TransformType).toHaveProperty('SPREAD');
    expect(TransformType).toHaveProperty('UNKNOWN');
  });

  it('default export points to TransformType enum', () => {
    expect(TransformTypeDefault).toBe(TransformType);
  });
});

