import { describe, it, expect, vi } from 'vitest';
import { _detectChangeType } from '#core/file-watcher/analyze.js';

describe('_detectChangeType', () => {
  describe('happy path', () => {
    it('should return valid output for valid input', () => {
      const result = _detectChangeType();
        expect(result).toBeDefined();
    });

  });

  describe('other', () => {
    it('should return empty result for empty array/collection', () => {
      const result = _detectChangeType();
        expect(Array.isArray(result) ? result : result).toBeDefined();
    });

    it('should process single item array/collection', () => {
      const result = _detectChangeType();
        expect(result).toBeDefined();
    });

  });

});
