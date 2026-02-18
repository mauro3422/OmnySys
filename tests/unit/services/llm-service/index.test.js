import { describe, it, expect } from 'vitest';
import * as llmService from '#services/llm-service/index.js';

describe('llm-service/index.js', () => {
  describe('exports', () => {
    it('should export LLMService class', () => {
      expect(llmService.LLMService).toBeDefined();
      expect(typeof llmService.LLMService).toBe('function');
    });

    it('should export CB_STATE constants', () => {
      expect(llmService.CB_STATE).toBeDefined();
      expect(llmService.CB_STATE.CLOSED).toBe('CLOSED');
      expect(llmService.CB_STATE.OPEN).toBe('OPEN');
      expect(llmService.CB_STATE.HALF_OPEN).toBe('HALF_OPEN');
    });

    it('should have default export', () => {
      expect(llmService.default).toBeDefined();
      expect(llmService.default).toBe(llmService.LLMService);
    });
  });
});
