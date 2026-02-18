import { describe, it, expect } from 'vitest';
import * as providers from '#services/llm-service/providers/index.js';

describe('providers/index.js', () => {
  describe('exports', () => {
    it('should export BaseProvider', () => {
      expect(providers.BaseProvider).toBeDefined();
      expect(typeof providers.BaseProvider).toBe('function');
    });

    it('should export CB_STATE', () => {
      expect(providers.CB_STATE).toBeDefined();
      expect(providers.CB_STATE.CLOSED).toBe('CLOSED');
      expect(providers.CB_STATE.OPEN).toBe('OPEN');
      expect(providers.CB_STATE.HALF_OPEN).toBe('HALF_OPEN');
    });

    it('should export LocalProvider', () => {
      expect(providers.LocalProvider).toBeDefined();
      expect(typeof providers.LocalProvider).toBe('function');
    });

    it('should export OpenAIProvider', () => {
      expect(providers.OpenAIProvider).toBeDefined();
      expect(typeof providers.OpenAIProvider).toBe('function');
    });

    it('should export AnthropicProvider', () => {
      expect(providers.AnthropicProvider).toBeDefined();
      expect(typeof providers.AnthropicProvider).toBe('function');
    });
  });
});
