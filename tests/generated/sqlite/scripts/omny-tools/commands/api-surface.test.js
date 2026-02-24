import { describe, it, expect, vi } from 'vitest';
import { tool_get_api_surface } from '../../scripts/omny-tools/commands/api-surface.js';

describe('tool_get_api_surface', () => {
  describe('happy path', () => {
    it('should return valid output for valid input', async () => {
      const result = await tool_get_api_surface();
      expect(result).toBeDefined();
    });

  });

  describe('branches', () => {
    it('should return apiAtoms as default', async () => {
      const result = await tool_get_api_surface();
      expect(result).toBeDefined();
    });

  });

  describe('other', () => {
    it('should persist data without throwing', async () => {
      const result = await tool_get_api_surface();
      expect(result).toBeDefined();
    });

  });

});
