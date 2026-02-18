import { describe, it, expect } from 'vitest';
import * as services from '#services/index.js';

describe('services/index.js', () => {
  describe('exports', () => {
    it('should export LLMService', () => {
      expect(services.LLMService).toBeDefined();
      expect(typeof services.LLMService).toBe('function');
    });

    // Previously these were "BUG:" tests documenting missing exports.
    // Fixed in v0.9.16: llm-service.js wrapper now correctly exports these
    // convenience functions from the modular sub-structure.
    it('should export analyzeWithLLM (convenience function)', () => {
      expect(services.analyzeWithLLM).toBeDefined();
      expect(typeof services.analyzeWithLLM).toBe('function');
    });

    it('should export isLLMAvailable (convenience function)', () => {
      expect(services.isLLMAvailable).toBeDefined();
      expect(typeof services.isLLMAvailable).toBe('function');
    });

    it('should export waitForLLM (convenience function)', () => {
      expect(services.waitForLLM).toBeDefined();
      expect(typeof services.waitForLLM).toBe('function');
    });

    it('should have default export', () => {
      expect(services.default).toBeDefined();
      expect(services.default).toBe(services.LLMService);
    });
  });
});
