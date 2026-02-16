import { describe, it, expect } from 'vitest';
import { extractJSDocContracts } from '#layer-a/extractors/metadata/jsdoc-contracts.js';

describe('extractors/metadata/jsdoc-contracts.js', () => {
  it('extracts param/returns/throws/deprecated contracts from JSDoc blocks', () => {
    const code = `
      /**
       * Adds numbers
       * @param {number} a - first
       * @param {number} b - second
       * @returns {number} sum
       * @throws {RangeError} invalid
       * @deprecated use addV2
       */
      function add(a, b) { return a + b; }
    `;
    const contracts = extractJSDocContracts(code);
    expect(contracts.functions).toHaveLength(1);
    expect(contracts.functions[0].params).toHaveLength(2);
    expect(contracts.functions[0].returns.type).toBe('number');
    expect(contracts.functions[0].throws[0].type).toBe('RangeError');
    expect(contracts.functions[0].deprecated).toBe(true);
  });
});

