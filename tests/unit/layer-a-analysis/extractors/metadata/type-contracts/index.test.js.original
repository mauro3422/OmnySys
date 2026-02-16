import { describe, it, expect } from 'vitest';
import * as contracts from '#layer-a/extractors/metadata/type-contracts/index.js';

describe('extractors/metadata/type-contracts/index.js', () => {
  it('exports core API and strategies', () => {
    expect(contracts.extractTypeContracts).toBeTypeOf('function');
    expect(contracts.validateTypeCompatibility).toBeTypeOf('function');
    expect(contracts.ExtractionStrategy).toBeTypeOf('function');
    expect(contracts.JSDocStrategy).toBeTypeOf('function');
    expect(contracts.TypeScriptStrategy).toBeTypeOf('function');
    expect(contracts.InferenceStrategy).toBeTypeOf('function');
  });
});

