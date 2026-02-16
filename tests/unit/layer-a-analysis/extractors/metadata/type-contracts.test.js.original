import { describe, it, expect } from 'vitest';
import * as legacy from '#layer-a/extractors/metadata/type-contracts.js';
import * as modern from '#layer-a/extractors/metadata/type-contracts/index.js';

describe('extractors/metadata/type-contracts.js', () => {
  it('re-exports compatibility API from modular index', () => {
    expect(legacy.extractTypeContracts).toBe(modern.extractTypeContracts);
    expect(legacy.validateTypeCompatibility).toBe(modern.validateTypeCompatibility);
    expect(legacy.analyzeType).toBe(modern.analyzeType);
    expect(legacy.InferenceStrategy).toBeTypeOf('function');
  });
});

