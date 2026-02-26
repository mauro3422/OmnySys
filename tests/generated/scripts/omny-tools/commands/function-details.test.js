import { describe, it, expect, vi } from 'vitest';
import { tool_get_function_details } from '../../scripts/omny-tools/commands/function-details.js';

describe('tool_get_function_details', () => {
  describe('happy path', () => {
    it('should return valid output for valid input', async () => {
      const result = await tool_get_function_details();
        expect(result).toBeDefined();
    });

  });

  describe('other', () => {
    it('should return null for matching input', async () => {
      const result = await tool_get_function_details();
        expect(result).toBeNull();
    });

    it('should handle value "atomId"', async () => {
      const result = await tool_get_function_details();
        expect(result).toBeDefined();
    });

  });

});
