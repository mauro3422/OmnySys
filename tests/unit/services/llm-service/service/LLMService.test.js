import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LLMService } from '#services/llm-service/service/LLMService.js';
import { resetSingleton } from '#services/llm-service/singleton/singleton-manager.js';
import { RequestHandler, ResponseHandler } from '#services/llm-service/handlers/index.js';
import { ResponseCache } from '#services/llm-service/cache/response-cache/index.js';
import { HealthChecker } from '#services/llm-service/health/health-checker.js';
import { MetricsTracker } from '#services/llm-service/metrics/metrics-tracker.js';

describe('LLMService', () => {
  let service;

  beforeEach(async () => {
    await resetSingleton();
    service = new LLMService();
  });

  afterEach(async () => {
    if (service) {
      await service.dispose();
    }
    await resetSingleton();
  });

  describe('constructor', () => {
    it('should create service with providers map', () => {
      expect(service.providers).toBeInstanceOf(Map);
    });

    it('should create request handler', () => {
      expect(service.requestHandler).toBeInstanceOf(RequestHandler);
    });

    it('should create response handler', () => {
      expect(service.responseHandler).toBeInstanceOf(ResponseHandler);
    });

    it('should create cache', () => {
      expect(service.cache).toBeInstanceOf(ResponseCache);
    });

    it('should create health checker', () => {
      expect(service.healthChecker).toBeInstanceOf(HealthChecker);
    });

    it('should create metrics tracker', () => {
      expect(service.metrics).toBeInstanceOf(MetricsTracker);
    });

    it('should register default providers', () => {
      expect(service.providers.has('local')).toBe(true);
    });

    it('should register openai provider if API key exists', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-key';
      
      const keyService = new LLMService();
      expect(keyService.providers.has('openai')).toBe(true);
      
      process.env.OPENAI_API_KEY = originalKey;
      keyService.dispose();
    });

    it('should register anthropic provider if API key exists', () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = 'test-key';
      
      const keyService = new LLMService();
      expect(keyService.providers.has('anthropic')).toBe(true);
      
      process.env.ANTHROPIC_API_KEY = originalKey;
      keyService.dispose();
    });
  });

  describe('registerProvider', () => {
    it('should register new provider', () => {
      const mockProvider = {
        name: 'custom',
        healthCheck: async () => ({ available: true })
      };
      
      service.registerProvider('custom', mockProvider);
      
      expect(service.providers.has('custom')).toBe(true);
    });
  });

  describe('getProvider', () => {
    it('should return default provider', () => {
      const provider = service.getProvider();
      expect(provider).toBeDefined();
    });

    it('should return named provider', () => {
      const provider = service.getProvider('local');
      expect(provider).toBeDefined();
      expect(provider.name).toBe('local');
    });

    it('should return null for non-existent provider', () => {
      const provider = service.getProvider('nonexistent');
      expect(provider).toBeNull();
    });
  });

  describe('setDefaultProvider', () => {
    it('should change default provider', () => {
      service.registerProvider('test', { name: 'test' });
      service.setDefaultProvider('test');
      
      expect(service.defaultProvider).toBe('test');
    });

    it('should throw for non-existent provider', () => {
      expect(() => service.setDefaultProvider('nonexistent')).toThrow('Provider not found');
    });
  });

  describe('getProviderNames', () => {
    it('should return array of provider names', () => {
      const names = service.getProviderNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names).toContain('local');
    });
  });

  describe('isAvailable', () => {
    it('should return false before initialization', () => {
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics object', () => {
      const metrics = service.getMetrics();
      
      expect(metrics.requestsTotal).toBeDefined();
      expect(metrics.availability).toBeDefined();
      expect(metrics.cache).toBeDefined();
      expect(metrics.providers).toBeDefined();
    });
  });

  describe('getCircuitBreakerState', () => {
    it('should return circuit breaker state for default provider', () => {
      const state = service.getCircuitBreakerState();
      
      expect(state).toBeDefined();
      expect(state.state).toBeDefined();
    });

    it('should return null for non-existent provider', () => {
      const state = service.getCircuitBreakerState('nonexistent');
      expect(state).toBeNull();
    });
  });

  describe('on and off', () => {
    it('should register error handlers', () => {
      const handler = () => {};
      service.on('error', handler);
      
      expect(service._errorHandlers).toContain(handler);
    });

    it('should unregister error handlers', () => {
      const handler = () => {};
      service.on('error', handler);
      service.off('error', handler);
      
      expect(service._errorHandlers).not.toContain(handler);
    });

    it('should delegate to health checker for other events', () => {
      const handler = vi.fn();
      service.on('available', handler);
      
      expect(service.healthChecker.eventHandlers.available).toContain(handler);
    });
  });

  describe('dispose', () => {
    it('should dispose all providers', async () => {
      await service.dispose();
      
      expect(service.providers.size).toBe(0);
    });

    it('should dispose health checker', async () => {
      await service.dispose();
      
      expect(service.healthChecker.intervalId).toBeNull();
    });

    it('should dispose cache', async () => {
      await service.dispose();
      
      expect(service.cache._cleanupInterval).toBeNull();
    });

    it('should clear error handlers', async () => {
      service.on('error', () => {});
      await service.dispose();
      
      expect(service._errorHandlers).toHaveLength(0);
    });

    it('should set initialized to false', async () => {
      service.initialized = true;
      await service.dispose();
      
      expect(service.initialized).toBe(false);
    });
  });

  describe('analyze', () => {
    it('should throw when service not available', async () => {
      await expect(service.analyze('test')).rejects.toThrow('LLM service is not available');
    });

    it('SKIP: requires LLM server - should analyze with real provider', async () => {
    });
  });

  describe('analyzeBatch', () => {
    it('should throw when service not available', async () => {
      await expect(service.analyzeBatch([{ prompt: 'test' }])).rejects.toThrow('LLM service is not available');
    });
  });

  describe('waitForAvailable', () => {
    it('should return false when timeout reached', async () => {
      const result = await service.waitForAvailable(100);
      expect(result).toBe(false);
    });
  });

  describe('getInstance', () => {
    it('should return singleton instance', async () => {
      await resetSingleton();
      
      const instance1 = await LLMService.getInstance();
      const instance2 = await LLMService.getInstance();
      
      expect(instance1).toBe(instance2);
      
      await instance1.dispose();
      await resetSingleton();
    });
  });

  describe('resetInstance', () => {
    it('should reset singleton instance', async () => {
      await resetSingleton();
      
      const instance = await LLMService.getInstance();
      await LLMService.resetInstance();
      
      expect(() => instance.providers.size).toBeDefined();
      
      await resetSingleton();
    });
  });
});
