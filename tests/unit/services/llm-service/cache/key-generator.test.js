import { describe, it, expect } from 'vitest';
import { generateKey } from '#services/llm-service/cache/response-cache/cache/key-generator.js';

describe('key-generator', () => {
  describe('generateKey', () => {
    it('should generate a string key', () => {
      const key = generateKey('test prompt');
      expect(typeof key).toBe('string');
    });

    it('should start with cache_ prefix', () => {
      const key = generateKey('test prompt');
      expect(key.startsWith('cache_')).toBe(true);
    });

    it('should generate same key for same inputs', () => {
      const key1 = generateKey('test prompt', { model: 'gpt-4' });
      const key2 = generateKey('test prompt', { model: 'gpt-4' });
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different prompts', () => {
      const key1 = generateKey('prompt 1');
      const key2 = generateKey('prompt 2');
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different models', () => {
      const key1 = generateKey('test', { model: 'gpt-4' });
      const key2 = generateKey('test', { model: 'gpt-3.5' });
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different temperatures', () => {
      const key1 = generateKey('test', { temperature: 0.7 });
      const key2 = generateKey('test', { temperature: 0.5 });
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different maxTokens', () => {
      const key1 = generateKey('test', { maxTokens: 1000 });
      const key2 = generateKey('test', { maxTokens: 2000 });
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different system prompts', () => {
      const key1 = generateKey('test', { systemPrompt: 'system 1' });
      const key2 = generateKey('test', { systemPrompt: 'system 2' });
      expect(key1).not.toBe(key2);
    });
  });

  describe('with empty options', () => {
    it('should work with no options', () => {
      const key = generateKey('test prompt');
      expect(key).toBeDefined();
    });

    it('should work with empty options object', () => {
      const key = generateKey('test prompt', {});
      expect(key).toBeDefined();
    });

    it('should use default model when not specified', () => {
      const key1 = generateKey('test', {});
      const key2 = generateKey('test', { model: 'default' });
      expect(key1).toBe(key2);
    });
  });

  describe('with special characters', () => {
    it('should handle special characters in prompt', () => {
      const key = generateKey('test\nwith\nnewlines\tand\ttabs');
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });

    it('should handle unicode in prompt', () => {
      const key = generateKey('test with unicode: 你好世界 🎉');
      expect(key).toBeDefined();
    });

    it('should handle very long prompts', () => {
      const longPrompt = 'x'.repeat(10000);
      const key = generateKey(longPrompt);
      expect(key).toBeDefined();
    });
  });

  describe('determinism', () => {
    it('should be deterministic across multiple calls', () => {
      const prompt = 'test prompt';
      const options = { model: 'gpt-4', temperature: 0.5 };
      
      const keys = Array(10).fill(null).map(() => generateKey(prompt, options));
      const uniqueKeys = new Set(keys);
      
      expect(uniqueKeys.size).toBe(1);
    });

    it('should handle options with extra fields', () => {
      const key1 = generateKey('test', { model: 'gpt-4', extra: 'field' });
      const key2 = generateKey('test', { model: 'gpt-4' });
      expect(key1).toBe(key2);
    });
  });
});
