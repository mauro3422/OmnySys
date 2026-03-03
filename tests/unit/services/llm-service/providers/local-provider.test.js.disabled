import { describe, it, expect, beforeEach } from 'vitest';
import { LocalProvider } from '#services/llm-service/providers/local-provider.js';
import { CB_STATE } from '#services/llm-service/providers/base-provider.js';

describe('LocalProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new LocalProvider();
  });

  describe('constructor', () => {
    it('should create provider with name local', () => {
      expect(provider.name).toBe('local');
    });

    it('should not have client initially', () => {
      expect(provider.client).toBeNull();
    });

    it('should not be config loaded initially', () => {
      expect(provider._configLoaded).toBe(false);
    });
  });

  describe('analyze', () => {
    it('should throw when circuit breaker is open', async () => {
      provider._cbState = CB_STATE.OPEN;
      
      await expect(provider.analyze('test')).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('SKIP: requires LLM server - should initialize and analyze', async () => {
    });
  });

  describe('healthCheck', () => {
    it('SKIP: requires LLM server - should return health status', async () => {
    });
  });

  describe('dispose', () => {
    it('should clear client', async () => {
      await provider.dispose();
      
      expect(provider.client).toBeNull();
      expect(provider._configLoaded).toBe(false);
    });
  });
});
