import { describe, it, expect, beforeEach } from 'vitest';
import { BaseProvider, CB_STATE } from '#services/llm-service/providers/base-provider.js';
import { ProviderConfigBuilder } from '#test-factories/services/builders.js';

describe('BaseProvider', () => {
  it('should throw when instantiated directly', () => {
    expect(() => new BaseProvider()).toThrow('BaseProvider is abstract');
  });
});

describe('Concrete BaseProvider', () => {
  let provider;

  class TestProvider extends BaseProvider {
    constructor(config) {
      super(config);
      this.name = 'test';
    }
    
    async analyze() {
      return { content: 'test' };
    }
    
    async healthCheck() {
      return { available: true };
    }
    
    async dispose() {}
  }

  beforeEach(() => {
    provider = new TestProvider();
  });

  describe('constructor', () => {
    it('should create provider with default circuit breaker config', () => {
      expect(provider._cbState).toBe(CB_STATE.CLOSED);
      expect(provider._cbThreshold).toBe(5);
      expect(provider._cbResetTimeoutMs).toBe(30000);
    });

    it('should accept custom circuit breaker config', () => {
      const config = ProviderConfigBuilder.create()
        .withThreshold(10)
        .withResetTimeout(60000)
        .build();
      
      const customProvider = new TestProvider(config);
      
      expect(customProvider._cbThreshold).toBe(10);
      expect(customProvider._cbResetTimeoutMs).toBe(60000);
    });
  });

  describe('isCircuitBreakerClosed', () => {
    it('should return true when closed', () => {
      expect(provider.isCircuitBreakerClosed()).toBe(true);
    });

    it('should return false when open', () => {
      provider._cbState = CB_STATE.OPEN;
      expect(provider.isCircuitBreakerClosed()).toBe(false);
    });

    it('should return true when half-open', () => {
      provider._cbState = CB_STATE.HALF_OPEN;
      expect(provider.isCircuitBreakerClosed()).toBe(true);
    });

    it('should transition to half-open after timeout', () => {
      provider._cbState = CB_STATE.OPEN;
      provider._cbLastFailureTime = Date.now() - 40000;
      
      provider.isCircuitBreakerClosed();
      
      expect(provider._cbState).toBe(CB_STATE.HALF_OPEN);
    });

    it('should not transition before timeout', () => {
      provider._cbState = CB_STATE.OPEN;
      provider._cbLastFailureTime = Date.now() - 1000;
      
      const result = provider.isCircuitBreakerClosed();
      
      expect(result).toBe(false);
      expect(provider._cbState).toBe(CB_STATE.OPEN);
    });
  });

  describe('recordSuccess', () => {
    it('should decrement failure count when closed', () => {
      provider._cbFailureCount = 3;
      provider.recordSuccess();
      expect(provider._cbFailureCount).toBe(2);
    });

    it('should not go below zero', () => {
      provider._cbFailureCount = 0;
      provider.recordSuccess();
      expect(provider._cbFailureCount).toBe(0);
    });

    it('should transition to closed after half-open successes', () => {
      provider._cbState = CB_STATE.HALF_OPEN;
      provider._cbSuccessCount = 0;
      
      provider.recordSuccess();
      provider.recordSuccess();
      
      expect(provider._cbState).toBe(CB_STATE.CLOSED);
      expect(provider._cbFailureCount).toBe(0);
    });
  });

  describe('recordFailure', () => {
    it('should increment failure count', () => {
      provider.recordFailure();
      expect(provider._cbFailureCount).toBe(1);
    });

    it('should update last failure time', () => {
      provider.recordFailure();
      expect(provider._cbLastFailureTime).toBeDefined();
    });

    it('should open circuit breaker at threshold', () => {
      for (let i = 0; i < 5; i++) {
        provider.recordFailure();
      }
      
      expect(provider._cbState).toBe(CB_STATE.OPEN);
    });

    it('should return true when circuit opens', () => {
      let result = false;
      for (let i = 0; i < 5; i++) {
        result = provider.recordFailure();
      }
      
      expect(result).toBe(true);
    });

    it('should return false before threshold', () => {
      const result = provider.recordFailure();
      expect(result).toBe(false);
    });
  });

  describe('getCircuitBreakerState', () => {
    it('should return circuit breaker state object', () => {
      const state = provider.getCircuitBreakerState();
      
      expect(state.state).toBe(CB_STATE.CLOSED);
      expect(state.failureCount).toBe(0);
      expect(state.successCount).toBe(0);
      expect(state.threshold).toBe(5);
      expect(state.resetTimeoutMs).toBe(30000);
      expect(state.lastFailureTime).toBeNull();
    });
  });

  describe('resetCircuitBreaker', () => {
    it('should reset to closed state', () => {
      provider._cbState = CB_STATE.OPEN;
      provider._cbFailureCount = 10;
      provider._cbLastFailureTime = Date.now();
      
      provider.resetCircuitBreaker();
      
      expect(provider._cbState).toBe(CB_STATE.CLOSED);
      expect(provider._cbFailureCount).toBe(0);
      expect(provider._cbSuccessCount).toBe(0);
      expect(provider._cbLastFailureTime).toBeNull();
    });
  });
});

describe('CB_STATE', () => {
  it('should have CLOSED state', () => {
    expect(CB_STATE.CLOSED).toBe('CLOSED');
  });

  it('should have OPEN state', () => {
    expect(CB_STATE.OPEN).toBe('OPEN');
  });

  it('should have HALF_OPEN state', () => {
    expect(CB_STATE.HALF_OPEN).toBe('HALF_OPEN');
  });
});
