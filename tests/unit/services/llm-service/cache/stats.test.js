import { describe, it, expect, beforeEach } from 'vitest';
import { getStats } from '#services/llm-service/cache/response-cache/utils/stats.js';
import { CacheEntry } from '#services/llm-service/cache/response-cache/cache/cache-entry.js';

describe('stats', () => {
  let cache;
  let config;
  let stats;

  beforeEach(() => {
    cache = new Map();
    config = {
      enabled: true,
      defaultTTL: 5000,
      maxSize: 100
    };
    stats = { hits: 0, misses: 0 };
  });

  describe('getStats', () => {
    it('should return stats object with all fields', () => {
      const result = getStats(cache, config, stats);
      
      expect(result).toHaveProperty('enabled');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('maxSize');
      expect(result).toHaveProperty('hits');
      expect(result).toHaveProperty('misses');
      expect(result).toHaveProperty('hitRate');
      expect(result).toHaveProperty('expiredEntries');
      expect(result).toHaveProperty('defaultTTL');
    });

    it('should return correct size', () => {
      cache.set('key1', new CacheEntry('key1', 'value', 1000));
      cache.set('key2', new CacheEntry('key2', 'value', 1000));
      
      const result = getStats(cache, config, stats);
      
      expect(result.size).toBe(2);
    });

    it('should return correct hit/miss counts', () => {
      stats.hits = 10;
      stats.misses = 5;
      
      const result = getStats(cache, config, stats);
      
      expect(result.hits).toBe(10);
      expect(result.misses).toBe(5);
    });

    it('should calculate hit rate correctly', () => {
      stats.hits = 75;
      stats.misses = 25;
      
      const result = getStats(cache, config, stats);
      
      expect(result.hitRate).toBe('75.00%');
    });

    it('should return 0% hit rate with no requests', () => {
      const result = getStats(cache, config, stats);
      
      expect(result.hitRate).toBe('0.00%');
    });

    it('should return 100% hit rate with only hits', () => {
      stats.hits = 10;
      stats.misses = 0;
      
      const result = getStats(cache, config, stats);
      
      expect(result.hitRate).toBe('100.00%');
    });

    it('should count expired entries', async () => {
      cache.set('expired', new CacheEntry('expired', 'value', 1));
      cache.set('valid', new CacheEntry('valid', 'value', 60000));
      
      await new Promise(r => setTimeout(r, 10));
      
      const result = getStats(cache, config, stats);
      
      expect(result.expiredEntries).toBe(1);
    });

    it('should return config values', () => {
      const result = getStats(cache, config, stats);
      
      expect(result.enabled).toBe(config.enabled);
      expect(result.maxSize).toBe(config.maxSize);
      expect(result.defaultTTL).toBe(config.defaultTTL);
    });

    it('should handle disabled cache', () => {
      config.enabled = false;
      
      const result = getStats(cache, config, stats);
      
      expect(result.enabled).toBe(false);
    });
  });

  describe('hit rate calculations', () => {
    it('should calculate 50% hit rate', () => {
      stats.hits = 5;
      stats.misses = 5;
      
      const result = getStats(cache, config, stats);
      
      expect(result.hitRate).toBe('50.00%');
    });

    it('should calculate 33.33% hit rate', () => {
      stats.hits = 1;
      stats.misses = 2;
      
      const result = getStats(cache, config, stats);
      
      expect(result.hitRate).toBe('33.33%');
    });

    it('should handle large numbers', () => {
      stats.hits = 10000;
      stats.misses = 5000;
      
      const result = getStats(cache, config, stats);
      
      expect(result.hitRate).toBe('66.67%');
    });
  });
});
