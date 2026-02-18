import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clear, cleanup, startCleanup, stopCleanup } from '#services/llm-service/cache/response-cache/storage/cache-maintenance.js';
import { CacheEntry } from '#services/llm-service/cache/response-cache/cache/cache-entry.js';

describe('cache-maintenance', () => {
  let cache;
  let stats;
  let responseCache;

  beforeEach(() => {
    cache = new Map();
    stats = { hits: 0, misses: 0 };
    responseCache = {
      _cache: cache,
      _cleanupInterval: null,
      config: { checkInterval: 100 }
    };
  });

  afterEach(() => {
    if (responseCache._cleanupInterval) {
      clearInterval(responseCache._cleanupInterval);
    }
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', new CacheEntry('key1', 'value1', 1000));
      cache.set('key2', new CacheEntry('key2', 'value2', 1000));
      
      clear(cache, stats);
      
      expect(cache.size).toBe(0);
    });

    it('should reset stats', () => {
      stats.hits = 10;
      stats.misses = 5;
      
      clear(cache, stats);
      
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries only', async () => {
      cache.set('expired', new CacheEntry('expired', 'value', 1));
      cache.set('valid', new CacheEntry('valid', 'value', 60000));
      
      await new Promise(r => setTimeout(r, 10));
      
      const removed = cleanup(cache);
      
      expect(removed).toBe(1);
      expect(cache.has('expired')).toBe(false);
      expect(cache.has('valid')).toBe(true);
    });

    it('should return 0 when no entries removed', () => {
      cache.set('valid1', new CacheEntry('valid1', 'value', 60000));
      cache.set('valid2', new CacheEntry('valid2', 'value', 60000));
      
      const removed = cleanup(cache);
      
      expect(removed).toBe(0);
      expect(cache.size).toBe(2);
    });

    it('should handle empty cache', () => {
      const removed = cleanup(cache);
      expect(removed).toBe(0);
    });

    it('should remove multiple expired entries', async () => {
      cache.set('expired1', new CacheEntry('expired1', 'value', 1));
      cache.set('expired2', new CacheEntry('expired2', 'value', 1));
      cache.set('expired3', new CacheEntry('expired3', 'value', 1));
      cache.set('valid', new CacheEntry('valid', 'value', 60000));
      
      await new Promise(r => setTimeout(r, 10));
      
      const removed = cleanup(cache);
      
      expect(removed).toBe(3);
      expect(cache.size).toBe(1);
    });
  });

  describe('startCleanup', () => {
    it('should start cleanup interval', () => {
      startCleanup(responseCache);
      
      expect(responseCache._cleanupInterval).not.toBeNull();
      
      stopCleanup(responseCache);
    });

    it('should not create duplicate intervals', () => {
      startCleanup(responseCache);
      const firstInterval = responseCache._cleanupInterval;
      
      startCleanup(responseCache);
      
      expect(responseCache._cleanupInterval).toBe(firstInterval);
      
      stopCleanup(responseCache);
    });
  });

  describe('stopCleanup', () => {
    it('should stop cleanup interval', () => {
      startCleanup(responseCache);
      expect(responseCache._cleanupInterval).not.toBeNull();
      
      stopCleanup(responseCache);
      
      expect(responseCache._cleanupInterval).toBeNull();
    });

    it('should handle when no interval exists', () => {
      expect(() => stopCleanup(responseCache)).not.toThrow();
    });
  });

  describe('automatic cleanup', () => {
    it('should cleanup expired entries periodically', async () => {
      vi.useFakeTimers();
      
      cache.set('expired', new CacheEntry('expired', 'value', 5));
      cache.set('valid', new CacheEntry('valid', 'value', 60000));
      
      responseCache.config.checkInterval = 10;
      startCleanup(responseCache);
      
      vi.advanceTimersByTime(15);
      
      expect(cache.has('expired')).toBe(false);
      expect(cache.has('valid')).toBe(true);
      
      stopCleanup(responseCache);
      vi.useRealTimers();
    });
  });
});
