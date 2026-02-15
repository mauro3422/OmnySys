import { describe, it, expect } from 'vitest';
import {
  analyzeType,
  normalizeType,
  isNullableType,
  extractThrowCondition
} from '#layer-a/extractors/metadata/type-contracts/types/type-analyzer.js';

describe('extractors/metadata/type-contracts/types/type-analyzer.js', () => {
  it('normalizes arrays/unions and extracts structured type analysis', () => {
    expect(normalizeType('string[]')).toBe('Array<string>');
    expect(normalizeType('string|number')).toBe('string | number');
    const analysis = analyzeType('Promise<Array<string>>');
    expect(analysis.baseType).toBe('Promise');
    expect(Array.isArray(analysis.generics)).toBe(true);
  });

  it('detects nullable types and throw condition hints', () => {
    expect(isNullableType('string | null')).toBe(true);
    expect(extractThrowCondition('Throws if value is missing')).toContain('value is missing');
  });
});

