import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AnthropicProvider } from '#services/llm-service/providers/anthropic-provider.js';
import { CB_STATE } from '#services/llm-service/providers/base-provider.js';

describe('AnthropicProvider', () => {
  let provider;
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    provider = new AnthropicProvider({ apiKey: 'test-key' });
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  describe('constructor', () => {
    it('should create provider with API key from config', () => {
      expect(provider.apiKey).toBe('test-key');
    });

    it('should use API key from environment', () => {
      process.env.ANTHROPIC_API_KEY = 'env-key';
      const envProvider = new AnthropicProvider();
      expect(envProvider.apiKey).toBe('env-key');
    });

    it('should have default configuration', () => {
      expect(provider.baseURL).toBe('https://api.anthropic.com/v1');
      expect(provider.model).toBe('claude-3-sonnet-20240229');
      expect(provider.maxRetries).toBe(3);
      expect(provider.timeout).toBe(60000);
      expect(provider.apiVersion).toBe('2023-06-01');
    });

    it('should accept custom configuration', () => {
      const customProvider = new AnthropicProvider({
        apiKey: 'test-key',
        baseURL: 'https://custom.api.com',
        model: 'claude-3-opus',
        maxRetries: 5,
        apiVersion: '2024-01-01'
      });
      
      expect(customProvider.baseURL).toBe('https://custom.api.com');
      expect(customProvider.model).toBe('claude-3-opus');
      expect(customProvider.maxRetries).toBe(5);
      expect(customProvider.apiVersion).toBe('2024-01-01');
    });
  });

  describe('analyze', () => {
    it('should throw when circuit breaker is open', async () => {
      provider._cbState = CB_STATE.OPEN;
      
      await expect(provider.analyze('test')).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('SKIP: requires LLM server - should make API request', async () => {
    });
  });

  describe('healthCheck', () => {
    it('SKIP: requires LLM server - should check API availability', async () => {
    });
  });

  describe('_shouldRetry', () => {
    it('should retry on network errors', () => {
      expect(provider._shouldRetry({})).toBe(true);
    });

    it('should retry on 5xx errors', () => {
      expect(provider._shouldRetry({ status: 500 })).toBe(true);
    });

    it('should retry on rate limit (429)', () => {
      expect(provider._shouldRetry({ status: 429 })).toBe(true);
    });

    it('should retry on Anthropic overloaded (529)', () => {
      expect(provider._shouldRetry({ status: 529 })).toBe(true);
    });

    it('should not retry on 4xx errors (except 429)', () => {
      expect(provider._shouldRetry({ status: 400 })).toBe(false);
      expect(provider._shouldRetry({ status: 401 })).toBe(false);
    });
  });

  describe('_sleep', () => {
    it('should resolve after specified time', async () => {
      const start = Date.now();
      await provider._sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });

  describe('dispose', () => {
    it('should dispose without errors', async () => {
      await expect(provider.dispose()).resolves.not.toThrow();
    });
  });
});
