import { describe, it, expect } from 'vitest';
import { extractThrows } from '#layer-a/extractors/metadata/error-flow/extractors/throw-extractor.js';

describe('extractors/metadata/error-flow/extractors/throw-extractor.js', () => {
  it('extracts explicit, jsdoc, and implicit throw metadata', () => {
    const code = `
      if (!x) throw new ValidationError("x required");
      const payload = JSON.parse(raw);
      fetch("/api");
    `;
    const throws = extractThrows(code, {
      throws: [{ type: 'ApiError', condition: 'network failure' }]
    });

    expect(throws.some(t => t.type === 'ValidationError' && t.source === 'explicit')).toBe(true);
    expect(throws.some(t => t.type === 'ApiError' && t.source === 'jsdoc')).toBe(true);
    expect(throws.some(t => t.source === 'implicit')).toBe(true);
  });
});

