import { describe, it, expect } from 'vitest';
import { extractErrorFlow } from '#layer-a/extractors/metadata/error-flow/extractors/error-flow-extractor.js';

describe('extractors/metadata/error-flow/extractors/error-flow-extractor.js', () => {
  it('builds full error flow report', () => {
    const code = `
      try {
        fetch("/x");
        throw new Error("boom");
      } catch (error) {
        console.error(error);
      }
    `;
    const result = extractErrorFlow(code);
    expect(result).toHaveProperty('throws');
    expect(result).toHaveProperty('catches');
    expect(result).toHaveProperty('tryBlocks');
    expect(result).toHaveProperty('propagation');
    expect(Array.isArray(result.unhandledCalls)).toBe(true);
  });
});

