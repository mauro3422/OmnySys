import { describe, it, expect, beforeEach } from 'vitest';
import { CacheEntry } from '#services/llm-service/cache/response-cache/cache/cache-entry.js';

describe('CacheEntry', () => {
  let entry;
  const key = 'test-key';
  const value = { data: 'test-data' };
  const ttlMs = 5000;

  beforeEach(() => {
    entry = new CacheEntry(key, value, ttlMs);
  });

  describe('constructor', () => {
    it('should create entry with key', () => {
      expect(entry.key).toBe(key);
    });

    it('should create entry with value', () => {
      expect(entry.value).toEqual(value);
    });

    it('should set createdAt to current time', () => {
      const now = Date.now();
      expect(entry.createdAt).toBeLessThanOrEqual(now);
      expect(entry.createdAt).toBeGreaterThan(now - 1000);
    });

    it('should calculate expiresAt from TTL', () => {
      expect(entry.expiresAt).toBe(entry.createdAt + ttlMs);
    });

    it('should initialize accessCount to 0', () => {
      expect(entry.accessCount).toBe(0);
    });

    it('should initialize lastAccessedAt to createdAt', () => {
      expect(entry.lastAccessedAt).toBe(entry.createdAt);
    });
  });

  describe('isExpired', () => {
    it('should return false for fresh entry', () => {
      expect(entry.isExpired()).toBe(false);
    });

    it('should return true for expired entry', async () => {
      const shortEntry = new CacheEntry(key, value, 1);
      await new Promise(r => setTimeout(r, 10));
      expect(shortEntry.isExpired()).toBe(true);
    });

    it('should return false when exactly at expiration time', () => {
      const now = Date.now();
      const entryAtBoundary = new CacheEntry(key, value, 1000);
      entryAtBoundary.expiresAt = now;
      expect(entryAtBoundary.isExpired()).toBe(false);
    });

    it('should return true when past expiration time', () => {
      const pastEntry = new CacheEntry(key, value, 1000);
      pastEntry.expiresAt = Date.now() - 1000;
      expect(pastEntry.isExpired()).toBe(true);
    });
  });

  describe('touch', () => {
    it('should increment accessCount', () => {
      entry.touch();
      expect(entry.accessCount).toBe(1);
      entry.touch();
      expect(entry.accessCount).toBe(2);
    });

    it('should update lastAccessedAt', async () => {
      const originalAccessTime = entry.lastAccessedAt;
      await new Promise(r => setTimeout(r, 10));
      entry.touch();
      expect(entry.lastAccessedAt).toBeGreaterThan(originalAccessTime);
    });
  });

  describe('with different value types', () => {
    it('should store string values', () => {
      const stringEntry = new CacheEntry('key', 'string-value', 1000);
      expect(stringEntry.value).toBe('string-value');
    });

    it('should store array values', () => {
      const arrayEntry = new CacheEntry('key', [1, 2, 3], 1000);
      expect(arrayEntry.value).toEqual([1, 2, 3]);
    });

    it('should store null values', () => {
      const nullEntry = new CacheEntry('key', null, 1000);
      expect(nullEntry.value).toBeNull();
    });

    it('should store complex objects', () => {
      const complexValue = {
        nested: { deep: { value: 42 } },
        array: [1, 2, 3],
        fn: () => 'test'
      };
      const complexEntry = new CacheEntry('key', complexValue, 1000);
      expect(complexEntry.value.nested.deep.value).toBe(42);
    });
  });
});
