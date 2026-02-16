import { describe, it, expect } from 'vitest';
import {
  extractDeclarations,
  extractReferences,
  extractAsyncCallbackVars,
  extractScopeInfo,
  findCapturedVariables,
  calculateCaptureRisk
} from '#layer-a/race-detector/closure-analysis/index.js';

describe('race-detector/closure-analysis/index.js', () => {
  it('exports closure analysis functions', () => {
    expect(extractDeclarations).toBeTypeOf('function');
    expect(extractReferences).toBeTypeOf('function');
    expect(extractAsyncCallbackVars).toBeTypeOf('function');
    expect(extractScopeInfo).toBeTypeOf('function');
    expect(findCapturedVariables).toBeTypeOf('function');
    expect(calculateCaptureRisk).toBeTypeOf('function');
  });

  it('extracts declarations/references and computes scope info', () => {
    const code = 'const state = 1; function run(){ return state + value; }';
    expect(extractDeclarations(code)).toContain('state');
    expect(extractReferences(code)).toContain('value');
    const scope = extractScopeInfo(code);
    expect(scope).toHaveProperty('captureCount');
  });
});
