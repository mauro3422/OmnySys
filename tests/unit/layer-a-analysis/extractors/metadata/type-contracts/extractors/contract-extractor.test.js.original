import { describe, it, expect } from 'vitest';
import {
  extractTypeContracts,
  generateSignature
} from '#layer-a/extractors/metadata/type-contracts/extractors/contract-extractor.js';

describe('extractors/metadata/type-contracts/extractors/contract-extractor.js', () => {
  it('extracts contracts using JSDoc strategy when metadata exists', () => {
    const jsdoc = {
      params: [{ name: 'id', type: 'string' }],
      returns: { type: 'number', description: 'status code' }
    };
    const out = extractTypeContracts('function fn(id){ return 200; }', jsdoc, {}, 'javascript');
    expect(out.params.length).toBeGreaterThan(0);
    expect(out.returns).not.toBeNull();
    expect(out.signature).toContain('=>');
  });

  it('builds function signature from a contract object', () => {
    const sig = generateSignature({
      params: [{ name: 'value', type: 'string', optional: false }],
      returns: { type: 'boolean' }
    });
    expect(sig).toBe('(value: string) => boolean');
  });
});

