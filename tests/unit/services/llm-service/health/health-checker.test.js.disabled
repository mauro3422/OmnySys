import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HealthChecker } from '#services/llm-service/health/health-checker.js';

describe('HealthChecker', () => {
  let healthChecker;

  beforeEach(() => {
    healthChecker = new HealthChecker({ intervalMs: 100 });
  });

  afterEach(() => {
    healthChecker.dispose();
  });

  describe('constructor', () => {
    it('should create checker with default interval', () => {
      const defaultChecker = new HealthChecker();
      expect(defaultChecker.intervalMs).toBe(5000);
      defaultChecker.dispose();
    });

    it('should create checker with custom interval', () => {
      expect(healthChecker.intervalMs).toBe(100);
    });

    it('should initialize as unavailable', () => {
      expect(healthChecker.available).toBe(false);
    });

    it('should initialize with no interval', () => {
      expect(healthChecker.intervalId).toBeNull();
    });
  });

  describe('check', () => {
    it('should return false for null provider', async () => {
      const result = await healthChecker.check(null);
      expect(result).toBe(false);
    });

    it('should return false for undefined provider', async () => {
      const result = await healthChecker.check(undefined);
      expect(result).toBe(false);
    });

    it('should call provider healthCheck', async () => {
      const provider = {
        healthCheck: vi.fn().mockResolvedValue({ available: true })
      };
      
      await healthChecker.check(provider);
      
      expect(provider.healthCheck).toHaveBeenCalled();
    });

    it('should update available status', async () => {
      const provider = {
        healthCheck: vi.fn().mockResolvedValue({ available: true })
      };
      
      await healthChecker.check(provider);
      
      expect(healthChecker.available).toBe(true);
    });

    it('should update lastCheck timestamp', async () => {
      const provider = {
        healthCheck: vi.fn().mockResolvedValue({ available: true })
      };
      
      await healthChecker.check(provider);
      
      expect(healthChecker.lastCheck).toBeDefined();
      expect(healthChecker.lastCheck).toBeLessThanOrEqual(Date.now());
    });

    it('should handle provider errors', async () => {
      const provider = {
        healthCheck: vi.fn().mockRejectedValue(new Error('health check failed'))
      };
      
      const result = await healthChecker.check(provider);
      
      expect(result).toBe(false);
      expect(healthChecker.available).toBe(false);
    });
  });

  describe('start and stop', () => {
    it('should start interval', () => {
      const checkFn = vi.fn();
      
      healthChecker.start(checkFn);
      
      expect(healthChecker.intervalId).not.toBeNull();
    });

    it('should not create duplicate intervals', () => {
      const checkFn = vi.fn();
      
      healthChecker.start(checkFn);
      const firstInterval = healthChecker.intervalId;
      
      healthChecker.start(checkFn);
      
      expect(healthChecker.intervalId).toBe(firstInterval);
    });

    it('should stop interval', () => {
      const checkFn = vi.fn();
      
      healthChecker.start(checkFn);
      healthChecker.stop();
      
      expect(healthChecker.intervalId).toBeNull();
    });

    it('should call checkFn periodically', async () => {
      vi.useFakeTimers();
      
      const checkFn = vi.fn();
      
      healthChecker.start(checkFn);
      
      vi.advanceTimersByTime(150);
      
      expect(checkFn).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('events', () => {
    it('should emit available event when becoming available', async () => {
      const handler = vi.fn();
      healthChecker.on('available', handler);
      
      const provider = {
        healthCheck: vi.fn().mockResolvedValue({ available: true })
      };
      
      await healthChecker.check(provider);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should emit unavailable event when becoming unavailable', async () => {
      const handler = vi.fn();
      healthChecker.on('unavailable', handler);
      
      const availableProvider = {
        healthCheck: vi.fn().mockResolvedValue({ available: true })
      };
      const unavailableProvider = {
        healthCheck: vi.fn().mockResolvedValue({ available: false })
      };
      
      await healthChecker.check(availableProvider);
      await healthChecker.check(unavailableProvider);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should not emit when state unchanged', async () => {
      const handler = vi.fn();
      healthChecker.on('available', handler);
      
      const provider = {
        healthCheck: vi.fn().mockResolvedValue({ available: true })
      };
      
      await healthChecker.check(provider);
      await healthChecker.check(provider);
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should remove event handler', async () => {
      const handler = vi.fn();
      healthChecker.on('available', handler);
      healthChecker.off('available', handler);
      
      const provider = {
        healthCheck: vi.fn().mockResolvedValue({ available: true })
      };
      
      await healthChecker.check(provider);
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = healthChecker.getState();
      
      expect(state.available).toBe(false);
      expect(state.lastCheck).toBeNull();
      expect(state.checking).toBe(false);
    });

    it('should show checking status when interval active', () => {
      healthChecker.start(() => {});
      
      const state = healthChecker.getState();
      
      expect(state.checking).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should stop interval', () => {
      healthChecker.start(() => {});
      healthChecker.dispose();
      
      expect(healthChecker.intervalId).toBeNull();
    });

    it('should clear event handlers', () => {
      healthChecker.on('available', () => {});
      healthChecker.dispose();
      
      expect(healthChecker.eventHandlers.available).toHaveLength(0);
      expect(healthChecker.eventHandlers.unavailable).toHaveLength(0);
    });
  });
});
