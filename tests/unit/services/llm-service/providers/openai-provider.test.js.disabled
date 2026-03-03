import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider } from '#services/llm-service/providers/openai-provider.js';
import { ProviderConfigBuilder } from '#test-factories/services/builders.js';
import { CB_STATE } from '#services/llm-service/providers/base-provider.js';

describe('OpenAIProvider', () => {
  let provider;
  const originalEnv = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    provider = new OpenAIProvider({ apiKey: 'test-key' });
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.OPENAI_API_KEY = originalEnv;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  describe('constructor', () => {
    it('should create provider with API key from config', () => {
      expect(provider.apiKey).toBe('test-key');
    });

    it('should use API key from environment', () => {
      process.env.OPENAI_API_KEY = 'env-key';
      const envProvider = new OpenAIProvider();
      expect(envProvider.apiKey).toBe('env-key');
    });

    it('should have default configuration', () => {
      expect(provider.baseURL).toBe('https://api.openai.com/v1');
      expect(provider.model).toBe('gpt-4');
      expect(provider.maxRetries).toBe(3);
      expect(provider.timeout).toBe(60000);
    });

    it('should accept custom configuration', () => {
      const customProvider = new OpenAIProvider({
        apiKey: 'test-key',
        baseURL: 'https://custom.api.com',
        model: 'gpt-3.5-turbo',
        maxRetries: 5,
        timeout: 30000
      });
      
      expect(customProvider.baseURL).toBe('https://custom.api.com');
      expect(customProvider.model).toBe('gpt-3.5-turbo');
      expect(customProvider.maxRetries).toBe(5);
      expect(customProvider.timeout).toBe(30000);
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
      expect(provider._shouldRetry({ status: 502 })).toBe(true);
      expect(provider._shouldRetry({ status: 503 })).toBe(true);
    });

    it('should retry on rate limit (429)', () => {
      expect(provider._shouldRetry({ status: 429 })).toBe(true);
    });

    it('should not retry on 4xx errors (except 429)', () => {
      expect(provider._shouldRetry({ status: 400 })).toBe(false);
      expect(provider._shouldRetry({ status: 401 })).toBe(false);
      expect(provider._shouldRetry({ status: 404 })).toBe(false);
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

  describe('circuit breaker integration', () => {
    it('should record failure on error', () => {
      const initialFailures = provider._cbFailureCount;
      provider.recordFailure();
      expect(provider._cbFailureCount).toBe(initialFailures + 1);
    });

    it('should reset circuit breaker', () => {
      provider._cbState = CB_STATE.OPEN;
      provider.resetCircuitBreaker();
      expect(provider._cbState).toBe(CB_STATE.CLOSED);
    });
  });
});
