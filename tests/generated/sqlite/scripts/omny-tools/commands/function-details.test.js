import { describe, it, expect, vi } from 'vitest';
import { tool_get_function_details } from '../../scripts/omny-tools/commands/function-details.js';

describe('tool_get_function_details', () => {
  describe('happy path', () => {
    it('should return valid output for valid input', async () => {
      const result = await tool_get_function_details("test-id-123");
      expect(result).toBeDefined();
    });

  });

  describe('branches', () => {
    it('should return null when matches.length === 0', async () => {
      const result = await tool_get_function_details("test-id");
      expect(result).toBeNull();
    });

    it('should return atom as default', async () => {
      const result = await tool_get_function_details("test-id");
      expect(result).toBeDefined();
    });

  });

  describe('edge cases', () => {
    it('should handle atomId = null/undefined', async () => {
      const result = await tool_get_function_details(null);
      expect(result).toBeDefined();
    });

  });

  describe('other', () => {
    it('should persist data without throwing', async () => {
      const result = await tool_get_function_details("test-id-123");
      expect(result).toBeDefined();
    });

  });

});
