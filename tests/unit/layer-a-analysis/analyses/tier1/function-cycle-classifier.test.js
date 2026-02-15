import { describe, it, expect } from 'vitest';
import * as legacy from '#layer-a/analyses/tier1/function-cycle-classifier.js';
import * as modern from '#layer-a/analyses/tier1/function-cycle-classifier/index.js';

describe('analyses/tier1/function-cycle-classifier.js', () => {
  it('re-exports compatibility API from modular entrypoint', () => {
    expect(legacy.classifyFunctionCycle).toBe(modern.classifyFunctionCycle);
    expect(legacy.classifyAllFunctionCycles).toBe(modern.classifyAllFunctionCycles);
    expect(legacy.FUNCTION_CYCLE_RULES).toBe(modern.FUNCTION_CYCLE_RULES);
    expect(legacy.extractFunctionMetadata).toBe(modern.extractFunctionMetadata);
  });

  it('keeps default export mapped to modular default', () => {
    expect(legacy.default).toEqual(modern.default);
  });
});

