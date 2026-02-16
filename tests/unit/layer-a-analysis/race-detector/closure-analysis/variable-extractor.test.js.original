import { describe, it, expect } from 'vitest';
import {
  extractDeclarations,
  extractReferences,
  extractAsyncCallbackVars,
  extractScopeInfo
} from '#layer-a/race-detector/closure-analysis/variable-extractor.js';

describe('race-detector/closure-analysis/variable-extractor.js', () => {
  it('extracts declarations across declaration styles', () => {
    const code = 'const a = 1; let b = 2; var c = 3; function fx(){}; const g = (x) => x;';
    const declarations = extractDeclarations(code);
    expect(declarations).toEqual(expect.arrayContaining(['a', 'b', 'c', 'fx', 'g']));
  });

  it('extracts references excluding JavaScript keywords', () => {
    const refs = extractReferences('if (state) { cache = processValue(state); }');
    expect(refs).toContain('state');
    expect(refs).toContain('cache');
    expect(refs).toContain('processValue');
    expect(refs).not.toContain('if');
  });

  it('extracts async callback variables and scope summary', () => {
    const code = 'promise.then((r) => stateCache = r + sharedCount);';
    const asyncVars = extractAsyncCallbackVars(code);
    const scope = extractScopeInfo('const x = 1; function run(){ return x + y; }');
    expect(asyncVars).toEqual(expect.arrayContaining(['stateCache', 'r', 'sharedCount']));
    expect(scope).toHaveProperty('declared');
    expect(scope).toHaveProperty('captured');
  });
});
