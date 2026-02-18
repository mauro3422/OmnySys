/**
 * @fileoverview Tests for LRU cache
 * @module tests/unit/layer-c-memory/shadow-registry/lru-cache.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ShadowCache } from '#layer-c/shadow-registry/cache/lru-cache.js';
import { ShadowBuilder } from '#test-factories/layer-c-shadow-registry';

describe('ShadowCache', () => {
  let cache;

  beforeEach(() => {
    cache = new ShadowCache(3);
  });

  describe('Structure Contract', () => {
    it('MUST export ShadowCache class', () => {
      expect(ShadowCache).toBeDefined();
      expect(typeof ShadowCache).toBe('function');
    });

    it('MUST have required methods', () => {
      expect(typeof cache.get).toBe('function');
      expect(typeof cache.set).toBe('function');
      expect(typeof cache.has).toBe('function');
      expect(typeof cache.delete).toBe('function');
      expect(typeof cache.clear).toBe('function');
    });

    it('MUST have size property', () => {
      expect(cache.size).toBeDefined();
    });
  });

  describe('constructor()', () => {
    it('creates cache with default max size', () => {
      const defaultCache = new ShadowCache();
      expect(defaultCache.maxSize).toBe(100);
    });

    it('creates cache with custom max size', () => {
      const customCache = new ShadowCache(50);
      expect(customCache.maxSize).toBe(50);
    });

    it('starts empty', () => {
      expect(cache.size).toBe(0);
    });
  });

  describe('get() and set()', () => {
    it('stores and retrieves values', () => {
      const shadow = ShadowBuilder.create().build();
      
      cache.set('shadow_1', shadow);
      const retrieved = cache.get('shadow_1');

      expect(retrieved).toEqual(shadow);
    });

    it('returns undefined for missing key', () => {
      const retrieved = cache.get('nonexistent');

      expect(retrieved).toBeUndefined();
    });

    it('updates existing key', () => {
      const shadow1 = ShadowBuilder.create().withStatus('deleted').build();
      const shadow2 = ShadowBuilder.create().withStatus('replaced').build();

      cache.set('shadow_1', shadow1);
      cache.set('shadow_1', shadow2);
      const retrieved = cache.get('shadow_1');

      expect(retrieved.status).toBe('replaced');
    });

    it('increments size on set', () => {
      cache.set('a', {});
      expect(cache.size).toBe(1);

      cache.set('b', {});
      expect(cache.size).toBe(2);
    });

    it('does not increment size on update', () => {
      cache.set('a', {});
      cache.set('a', { updated: true });

      expect(cache.size).toBe(1);
    });
  });

  describe('has()', () => {
    it('returns true for existing key', () => {
      cache.set('existing', {});

      expect(cache.has('existing')).toBe(true);
    });

    it('returns false for missing key', () => {
      expect(cache.has('missing')).toBe(false);
    });

    it('returns false after delete', () => {
      cache.set('toDelete', {});
      cache.delete('toDelete');

      expect(cache.has('toDelete')).toBe(false);
    });
  });

  describe('LRU eviction', () => {
    it('evicts oldest entry when full', () => {
      cache.set('a', { id: 'a' });
      cache.set('b', { id: 'b' });
      cache.set('c', { id: 'c' });
      cache.set('d', { id: 'd' });

      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    it('maintains correct size after eviction', () => {
      cache.set('a', {});
      cache.set('b', {});
      cache.set('c', {});
      cache.set('d', {});

      expect(cache.size).toBe(3);
    });

    it('evicts in FIFO order', () => {
      cache.set('first', { order: 1 });
      cache.set('second', { order: 2 });
      cache.set('third', { order: 3 });
      cache.set('fourth', { order: 4 });
      cache.set('fifth', { order: 5 });

      expect(cache.has('first')).toBe(false);
      expect(cache.has('second')).toBe(false);
      expect(cache.has('third')).toBe(true);
      expect(cache.has('fourth')).toBe(true);
      expect(cache.has('fifth')).toBe(true);
    });
  });

  describe('delete()', () => {
    it('removes entry', () => {
      cache.set('toRemove', {});

      cache.delete('toRemove');

      expect(cache.has('toRemove')).toBe(false);
    });

    it('decrements size', () => {
      cache.set('a', {});
      cache.set('b', {});

      cache.delete('a');

      expect(cache.size).toBe(1);
    });

    it('handles missing key gracefully', () => {
      expect(() => cache.delete('nonexistent')).not.toThrow();
    });

    it('does not affect other entries', () => {
      cache.set('keep', { keep: true });
      cache.set('remove', { remove: true });

      cache.delete('remove');

      expect(cache.get('keep')).toEqual({ keep: true });
    });
  });

  describe('clear()', () => {
    it('removes all entries', () => {
      cache.set('a', {});
      cache.set('b', {});
      cache.set('c', {});

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(false);
    });

    it('allows adding after clear', () => {
      cache.set('a', {});
      cache.clear();
      cache.set('b', {});

      expect(cache.size).toBe(1);
      expect(cache.has('b')).toBe(true);
    });
  });

  describe('size property', () => {
    it('returns correct count', () => {
      expect(cache.size).toBe(0);

      cache.set('a', {});
      expect(cache.size).toBe(1);

      cache.set('b', {});
      expect(cache.size).toBe(2);

      cache.delete('a');
      expect(cache.size).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles cache with size 1', () => {
      const tinyCache = new ShadowCache(1);

      tinyCache.set('a', {});
      tinyCache.set('b', {});

      expect(tinyCache.has('a')).toBe(false);
      expect(tinyCache.has('b')).toBe(true);
    });

    it('handles null values', () => {
      cache.set('nullValue', null);

      expect(cache.has('nullValue')).toBe(true);
      expect(cache.get('nullValue')).toBeNull();
    });

    it('handles undefined values', () => {
      cache.set('undefinedValue', undefined);

      expect(cache.has('undefinedValue')).toBe(true);
      expect(cache.get('undefinedValue')).toBeUndefined();
    });

    it('handles complex objects', () => {
      const complex = {
        shadow: ShadowBuilder.create().build(),
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3]
      };

      cache.set('complex', complex);
      const retrieved = cache.get('complex');

      expect(retrieved).toEqual(complex);
    });

    it('handles keys with special characters', () => {
      cache.set('shadow_test::func', {});
      cache.set('path/to/file.js', {});

      expect(cache.has('shadow_test::func')).toBe(true);
      expect(cache.has('path/to/file.js')).toBe(true);
    });
  });

  describe('Cache invalidation scenarios', () => {
    it('invalidates single entry', () => {
      cache.set('valid', { status: 'deleted' });
      cache.set('invalid', { status: 'deleted' });

      cache.delete('invalid');

      expect(cache.has('valid')).toBe(true);
      expect(cache.has('invalid')).toBe(false);
    });

    it('invalidates all entries', () => {
      cache.set('a', {});
      cache.set('b', {});
      cache.set('c', {});

      cache.clear();

      cache.set('new', {});
      expect(cache.size).toBe(1);
    });
  });

  describe('Performance', () => {
    it('handles large number of operations', () => {
      const largeCache = new ShadowCache(1000);

      for (let i = 0; i < 1000; i++) {
        largeCache.set(`key_${i}`, { index: i });
      }

      expect(largeCache.size).toBe(1000);

      largeCache.set('overflow', {});
      expect(largeCache.has('key_0')).toBe(false);
      expect(largeCache.has('overflow')).toBe(true);
    });

    it('maintains performance with frequent updates', () => {
      cache.set('frequent', { version: 1 });

      for (let i = 0; i < 100; i++) {
        cache.set('frequent', { version: i + 2 });
      }

      expect(cache.size).toBe(1);
      expect(cache.get('frequent').version).toBe(101);
    });
  });
});
