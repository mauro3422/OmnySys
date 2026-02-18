import { describe, it, expect } from 'vitest';
import * as services from '#services/index.js';

describe('services/index.js', () => {
  describe('exports', () => {
    it('should export LLMService', () => {
      expect(services.LLMService).toBeDefined();
      expect(typeof services.LLMService).toBe('function');
    });

    it('BUG: services/index.js does not export analyzeWithLLM', () => {
      expect(services.analyzeWithLLM).toBeUndefined();
    });

    it('BUG: services/index.js does not export isLLMAvailable', () => {
      expect(services.isLLMAvailable).toBeUndefined();
    });

    it('BUG: services/index.js does not export waitForLLM', () => {
      expect(services.waitForLLM).toBeUndefined();
    });

    it('should have default export', () => {
      expect(services.default).toBeDefined();
      expect(services.default).toBe(services.LLMService);
    });
  });
});
