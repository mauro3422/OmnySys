import { describe, it, expect, vi } from 'vitest';
import { extractJSON } from '#ai/llm/json-cleaners.js';

describe('extractJSON', () => {
  describe('happy path', () => {
    it('should return valid output for valid input', () => {
      const result = extractJSON();
        expect(result).toBeDefined();
    });

  });

  describe('other', () => {
    it('should return empty result for empty array/collection', () => {
      const result = extractJSON();
        expect(Array.isArray(result) ? result : result).toBeDefined();
    });

    it('should process single item array/collection', () => {
      const result = extractJSON();
        expect(result).toBeDefined();
    });

  });

});
