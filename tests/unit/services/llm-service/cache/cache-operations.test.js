import { describe, it, expect, beforeEach } from 'vitest';
import { get, set, has, del } from '#services/llm-service/cache/response-cache/storage/cache-operations.js';
import { CacheEntry } from '#services/llm-service/cache/response-cache/cache/cache-entry.js';

describe('cache-operations', () => {
  let cache;
  let config;
  let stats;

  beforeEach(() => {
    cache = new Map();
    config = {
      enabled: true,
      defaultTTL: 5000,
      maxSize: 10
    };
    stats = { hits: 0, misses: 0 };
  });

  describe('set', () => {
    it('should add entry to cache', () => {
      const result = set(cache, config, 'key1', { data: 'value' });
      expect(result).toBe(true);
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false when cache is disabled', () => {
      config.enabled = false;
      const result = set(cache, config, 'key1', { data: 'value' });
      expect(result).toBe(false);
      expect(cache.has('key1')).toBe(false);
    });

    it('should use default TTL when not specified', () => {
      set(cache, config, 'key1', { data: 'value' });
      const entry = cache.get('key1');
      expect(entry.expiresAt - entry.createdAt).toBe(config.defaultTTL);
    });

    it('should use custom TTL when specified', () => {
      const customTTL = 10000;
      set(cache, config, 'key1', { data: 'value' }, customTTL);
      const entry = cache.get('key1');
      expect(entry.expiresAt - entry.createdAt).toBe(customTTL);
    });

    it('should evict LRU when cache is full', () => {
      config.maxSize = 2;
      set(cache, config, 'key1', 'value1');
      set(cache, config, 'key2', 'value2');
      set(cache, config, 'key3', 'value3');
      
      expect(cache.size).toBe(2);
    });

    it('should update existing key without eviction', () => {
      config.maxSize = 2;
      set(cache, config, 'key1', 'value1');
      set(cache, config, 'key2', 'value2');
      set(cache, config, 'key1', 'updated');
      
      expect(cache.size).toBe(2);
      expect(cache.get('key1').value).toBe('updated');
    });
  });

  describe('get', () => {
    beforeEach(() => {
      set(cache, config, 'key1', { data: 'value' });
    });

    it('should return value for existing key', () => {
      const result = get(cache, config, stats, 'key1');
      expect(result).toEqual({ data: 'value' });
    });

    it('should return null for non-existent key', () => {
      const result = get(cache, config, stats, 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return null when cache is disabled', () => {
      config.enabled = false;
      const result = get(cache, config, stats, 'key1');
      expect(result).toBeNull();
    });

    it('should increment hits on successful get', () => {
      get(cache, config, stats, 'key1');
      expect(stats.hits).toBe(1);
    });

    it('should increment misses on failed get', () => {
      get(cache, config, stats, 'nonexistent');
      expect(stats.misses).toBe(1);
    });

    it('should delete and return null for expired entry', async () => {
      const shortEntry = new CacheEntry('key2', 'value', 1);
      cache.set('key2', shortEntry);
      await new Promise(r => setTimeout(r, 10));
      
      const result = get(cache, config, stats, 'key2');
      expect(result).toBeNull();
      expect(cache.has('key2')).toBe(false);
    });

    it('should increment misses for expired entry', async () => {
      const shortEntry = new CacheEntry('key2', 'value', 1);
      cache.set('key2', shortEntry);
      await new Promise(r => setTimeout(r, 10));
      
      get(cache, config, stats, 'key2');
      expect(stats.misses).toBe(1);
    });

    it('should touch entry on access', () => {
      const entry = cache.get('key1');
      const originalAccessCount = entry.accessCount;
      
      get(cache, config, stats, 'key1');
      
      expect(entry.accessCount).toBe(originalAccessCount + 1);
    });
  });

  describe('has', () => {
    beforeEach(() => {
      set(cache, config, 'key1', { data: 'value' });
    });

    it('should return true for existing key', () => {
      expect(has(cache, config, 'key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(has(cache, config, 'nonexistent')).toBe(false);
    });

    it('should return false when cache is disabled', () => {
      config.enabled = false;
      expect(has(cache, config, 'key1')).toBe(false);
    });

    it('should return false for expired entry', async () => {
      const shortEntry = new CacheEntry('key2', 'value', 1);
      cache.set('key2', shortEntry);
      await new Promise(r => setTimeout(r, 10));
      
      expect(has(cache, config, 'key2')).toBe(false);
    });

    it('should delete expired entry when checking', async () => {
      const shortEntry = new CacheEntry('key2', 'value', 1);
      cache.set('key2', shortEntry);
      await new Promise(r => setTimeout(r, 10));
      
      has(cache, config, 'key2');
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('del', () => {
    beforeEach(() => {
      set(cache, config, 'key1', { data: 'value' });
    });

    it('should delete existing key', () => {
      const result = del(cache, 'key1');
      expect(result).toBe(true);
      expect(cache.has('key1')).toBe(false);
    });

    it('should return false for non-existent key', () => {
      const result = del(cache, 'nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('integration', () => {
    it('should support set-get-delete cycle', () => {
      set(cache, config, 'key1', 'value1');
      expect(get(cache, config, stats, 'key1')).toBe('value1');
      
      del(cache, 'key1');
      expect(get(cache, config, stats, 'key1')).toBeNull();
    });

    it('should track stats correctly through operations', () => {
      set(cache, config, 'key1', 'value1');
      
      get(cache, config, stats, 'key1');
      expect(stats.hits).toBe(1);
      
      get(cache, config, stats, 'nonexistent');
      expect(stats.misses).toBe(1);
    });
  });
});
