import { describe, it, expect } from 'vitest';
import * as services from '#services/index.js';

describe('services/index.js', () => {
  describe('exports', () => {
    // LLMService class was deprecated and removed in v0.9.145 (Canonical DB Enforcement).
    // All LLM functionality was moved to MCP tools.
    // The convenience functions remain as stubs for backward compatibility.

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
  });
});
