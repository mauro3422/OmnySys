import { describe, it, expect } from 'vitest';
import { TypeScriptStrategy } from '#layer-a/extractors/metadata/type-contracts/strategies/typescript-strategy.js';

describe('extractors/metadata/type-contracts/strategies/typescript-strategy.js', () => {
  it('extracts contracts from TypeScript code patterns', () => {
    const strategy = new TypeScriptStrategy();
    const out = strategy.extract({
      code: 'function parse(id: string): number { return 1; }',
      language: 'typescript'
    });
    expect(out.params.length).toBe(1);
    expect(out.params[0].name).toBe('id');
    expect(out.returns.type).toBe('number');
  });

  it('identifies TypeScript contexts via language/annotations', () => {
    const strategy = new TypeScriptStrategy();
    expect(strategy.canHandle({ language: 'typescript', code: '' })).toBe(true);
    expect(strategy.canHandle({ code: 'const id: string = "x";' })).toBe(true);
  });
});

