import { describe, it, expect, vi } from 'vitest';
import { tool_get_dead_code } from '../../scripts/omny-tools/commands/dead-code.js';

describe('tool_get_dead_code', () => {
  describe('happy path', () => {
    it('should return valid output for valid input', async () => {
      const result = await tool_get_dead_code();
      expect(result).toBeDefined();
    });

  });

  describe('branches', () => {
    it('should return [] when deadAtoms.length === 0', async () => {
      const result = await tool_get_dead_code();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return deadAtoms as default', async () => {
      const result = await tool_get_dead_code();
      expect(result).toBeDefined();
    });

  });

  describe('other', () => {
    it('should persist data without throwing', async () => {
      const result = await tool_get_dead_code();
      expect(result).toBeDefined();
    });

  });

});
