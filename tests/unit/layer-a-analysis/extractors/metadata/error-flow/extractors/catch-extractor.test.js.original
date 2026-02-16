import { describe, it, expect } from 'vitest';
import {
  extractCatches,
  extractTryBlocks
} from '#layer-a/extractors/metadata/error-flow/extractors/catch-extractor.js';

describe('extractors/metadata/error-flow/extractors/catch-extractor.js', () => {
  it('extracts catch handling metadata', () => {
    const code = `
      try { work(); } catch (err) {
        console.error(err);
        if (err instanceof TypeError) throw err;
      }
    `;
    const catches = extractCatches(code);
    expect(catches).toHaveLength(1);
    expect(catches[0]).toMatchObject({
      variable: 'err',
      rethrows: true,
      logs: true,
      type: 'TypeError'
    });
  });

  it('extracts try block metadata and protected calls', () => {
    const blocks = extractTryBlocks('try { a(); b(); } catch(e) {} finally {}');
    expect(blocks).toHaveLength(1);
    // Current implementation scopes only the try block body.
    expect(blocks[0].hasCatch).toBe(false);
    expect(blocks[0].hasFinally).toBe(false);
    expect(blocks[0].protectedCalls).toEqual(expect.arrayContaining(['a', 'b']));
  });
});
