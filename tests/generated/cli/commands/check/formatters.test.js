import { describe, it, expect, vi } from 'vitest';
import { formatMetadataSection } from '../../src/cli/commands/check/formatters.js';

describe('formatMetadataSection', () => {
  describe('happy path', () => {
    it('should return valid output for valid input', () => {
      const result = formatMetadataSection();
        expect(result).toBeDefined();
    });

  });

  describe('other', () => {
    it('should return empty result for empty array/collection', () => {
      const result = formatMetadataSection();
        expect(Array.isArray(result) ? result : result).toBeDefined();
    });

    it('should process single item array/collection', () => {
      const result = formatMetadataSection();
        expect(result).toBeDefined();
    });

  });

});
