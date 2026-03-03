import { describe, it, expect } from 'vitest';
import * as service from '#services/llm-service/service/index.js';

describe('service/index.js', () => {
  describe('exports', () => {
    it('should export LLMService', () => {
      expect(service.LLMService).toBeDefined();
      expect(typeof service.LLMService).toBe('function');
    });

    it('should have default export', () => {
      expect(service.default).toBeDefined();
      expect(service.default).toBe(service.LLMService);
    });
  });
});
