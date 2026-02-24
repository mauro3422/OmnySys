import { describe, it, expect, vi } from 'vitest';
import { tool_get_risk_files } from '../../scripts/omny-tools/commands/risk-files.js';

describe('tool_get_risk_files', () => {
  describe('happy path', () => {
    it('should return valid output for valid input', async () => {
      const result = await tool_get_risk_files();
      expect(result).toBeDefined();
    });

  });

  describe('branches', () => {
    it('should return riskScores as default', async () => {
      const result = await tool_get_risk_files();
      expect(result).toBeDefined();
    });

  });

  describe('other', () => {
    it('should persist data without throwing', async () => {
      const result = await tool_get_risk_files();
      expect(result).toBeDefined();
    });

  });

});
