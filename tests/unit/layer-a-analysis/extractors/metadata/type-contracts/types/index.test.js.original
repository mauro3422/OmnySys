import { describe, it, expect } from 'vitest';
import {
  TYPE_KINDS,
  PRIMITIVE_TYPES,
  COERCION_TYPES
} from '#layer-a/extractors/metadata/type-contracts/types/index.js';

describe('extractors/metadata/type-contracts/types/index.js', () => {
  it('exports type taxonomy constants', () => {
    expect(TYPE_KINDS).toHaveProperty('PRIMITIVE');
    expect(TYPE_KINDS).toHaveProperty('PROMISE');
    expect(PRIMITIVE_TYPES.has('string')).toBe(true);
    expect(COERCION_TYPES).toHaveProperty('IMPLICIT');
  });
});

