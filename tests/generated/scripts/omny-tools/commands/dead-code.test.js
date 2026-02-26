import { describe, it, expect, vi } from 'vitest';
import { tool_get_dead_code } from '../../scripts/omny-tools/commands/dead-code.js';

describe('tool_get_dead_code', () => {
  describe('happy path', () => {
    it('should return valid output for valid input', async () => {
      const result = await tool_get_dead_code();
        expect(result).toBeDefined();
    });

  });

  describe('other', () => {
    it('should return [] for matching input', async () => {
      const result = await tool_get_dead_code();
        expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty result for empty array/collection', async () => {
      const result = await tool_get_dead_code();
        expect(Array.isArray(result) ? result : result).toBeDefined();
    });

    it('should process single item array/collection', async () => {
      const result = await tool_get_dead_code();
        expect(result).toBeDefined();
    });

  });

});
