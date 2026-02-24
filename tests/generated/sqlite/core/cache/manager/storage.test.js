import { describe, it, expect, vi } from 'vitest';
import { loadFromLayerA } from '#core/cache/manager/storage.js';

describe('loadFromLayerA', () => {
  describe('happy path', () => {
    it('should return valid output for valid input', async () => {
      const result = await loadFromLayerA();
      expect(result).toBeDefined();
    });

  });

  describe('error handling', () => {
    it('should throw SyntaxError when unprotected syntaxerror call', async () => {
      await expect(loadFromLayerA()).rejects.toThrow();
    });

  });

});
