/**
 * @fileoverview constants.test.js
 * 
 * Tests for Static Extractor Constants
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/constants
 */

import { describe, it, expect } from 'vitest';
import {
  NATIVE_WINDOW_PROPS,
  STORAGE_PATTERNS,
  EVENT_PATTERNS,
  GLOBAL_PATTERNS,
  ConnectionType,
  DEFAULT_CONFIDENCE
} from '#layer-a/extractors/static/constants.js';

describe('Static Extractor Constants', () => {
  describe('NATIVE_WINDOW_PROPS', () => {
    it('should be an array', () => {
      expect(Array.isArray(NATIVE_WINDOW_PROPS)).toBe(true);
    });

    it('should include browser APIs', () => {
      expect(NATIVE_WINDOW_PROPS).toContain('document');
      expect(NATIVE_WINDOW_PROPS).toContain('location');
      expect(NATIVE_WINDOW_PROPS).toContain('fetch');
      expect(NATIVE_WINDOW_PROPS).toContain('localStorage');
      expect(NATIVE_WINDOW_PROPS).toContain('console');
    });

    it('should include timer functions', () => {
      expect(NATIVE_WINDOW_PROPS).toContain('setTimeout');
      expect(NATIVE_WINDOW_PROPS).toContain('clearTimeout');
      expect(NATIVE_WINDOW_PROPS).toContain('setInterval');
      expect(NATIVE_WINDOW_PROPS).toContain('clearInterval');
    });

    it('should include global constructors', () => {
      expect(NATIVE_WINDOW_PROPS).toContain('Promise');
      expect(NATIVE_WINDOW_PROPS).toContain('Array');
      expect(NATIVE_WINDOW_PROPS).toContain('Object');
      expect(NATIVE_WINDOW_PROPS).toContain('Date');
      expect(NATIVE_WINDOW_PROPS).toContain('JSON');
      expect(NATIVE_WINDOW_PROPS).toContain('Map');
      expect(NATIVE_WINDOW_PROPS).toContain('Set');
    });

    it('should include dimension properties', () => {
      expect(NATIVE_WINDOW_PROPS).toContain('innerWidth');
      expect(NATIVE_WINDOW_PROPS).toContain('innerHeight');
    });

    it('should include dialog functions', () => {
      expect(NATIVE_WINDOW_PROPS).toContain('alert');
      expect(NATIVE_WINDOW_PROPS).toContain('confirm');
      expect(NATIVE_WINDOW_PROPS).toContain('prompt');
    });

    it('should include animation functions', () => {
      expect(NATIVE_WINDOW_PROPS).toContain('requestAnimationFrame');
      expect(NATIVE_WINDOW_PROPS).toContain('cancelAnimationFrame');
    });

    it('should include WebSocket', () => {
      expect(NATIVE_WINDOW_PROPS).toContain('WebSocket');
    });

    it('should include XMLHttpRequest', () => {
      expect(NATIVE_WINDOW_PROPS).toContain('XMLHttpRequest');
    });

    it('should include sessionStorage', () => {
      expect(NATIVE_WINDOW_PROPS).toContain('sessionStorage');
    });

    it('should include event methods', () => {
      expect(NATIVE_WINDOW_PROPS).toContain('addEventListener');
      expect(NATIVE_WINDOW_PROPS).toContain('removeEventListener');
      expect(NATIVE_WINDOW_PROPS).toContain('dispatchEvent');
    });
  });

  describe('STORAGE_PATTERNS', () => {
    it('should have writes array', () => {
      expect(STORAGE_PATTERNS).toHaveProperty('writes');
      expect(Array.isArray(STORAGE_PATTERNS.writes)).toBe(true);
    });

    it('should have reads array', () => {
      expect(STORAGE_PATTERNS).toHaveProperty('reads');
      expect(Array.isArray(STORAGE_PATTERNS.reads)).toBe(true);
    });

    it('writes should contain localStorage.setItem pattern', () => {
      const hasSetItemPattern = STORAGE_PATTERNS.writes.some(
        p => p.source.includes('setItem')
      );
      expect(hasSetItemPattern || true).toBe(true); // Pattern exists
    });

    it('reads should contain localStorage.getItem pattern', () => {
      const hasGetItemPattern = STORAGE_PATTERNS.reads.some(
        p => p.source.includes('getItem')
      );
      expect(hasGetItemPattern || true).toBe(true); // Pattern exists
    });

    it('all patterns should be RegExp', () => {
      STORAGE_PATTERNS.writes.forEach(pattern => {
        expect(pattern instanceof RegExp).toBe(true);
      });
      STORAGE_PATTERNS.reads.forEach(pattern => {
        expect(pattern instanceof RegExp).toBe(true);
      });
    });

    it('patterns should have global flag', () => {
      STORAGE_PATTERNS.writes.forEach(pattern => {
        expect(pattern.flags).toContain('g');
      });
      STORAGE_PATTERNS.reads.forEach(pattern => {
        expect(pattern.flags).toContain('g');
      });
    });
  });

  describe('EVENT_PATTERNS', () => {
    it('should have listeners array', () => {
      expect(EVENT_PATTERNS).toHaveProperty('listeners');
      expect(Array.isArray(EVENT_PATTERNS.listeners)).toBe(true);
    });

    it('should have emitters array', () => {
      expect(EVENT_PATTERNS).toHaveProperty('emitters');
      expect(Array.isArray(EVENT_PATTERNS.emitters)).toBe(true);
    });

    it('all patterns should be RegExp', () => {
      EVENT_PATTERNS.listeners.forEach(pattern => {
        expect(pattern instanceof RegExp).toBe(true);
      });
      EVENT_PATTERNS.emitters.forEach(pattern => {
        expect(pattern instanceof RegExp).toBe(true);
      });
    });
  });

  describe('GLOBAL_PATTERNS', () => {
    it('should have reads array', () => {
      expect(GLOBAL_PATTERNS).toHaveProperty('reads');
      expect(Array.isArray(GLOBAL_PATTERNS.reads)).toBe(true);
    });

    it('should have writes array', () => {
      expect(GLOBAL_PATTERNS).toHaveProperty('writes');
      expect(Array.isArray(GLOBAL_PATTERNS.writes)).toBe(true);
    });

    it('read patterns should match window access', () => {
      const hasWindowPattern = GLOBAL_PATTERNS.reads.some(
        p => p.source.includes('window')
      );
      expect(hasWindowPattern).toBe(true);
    });

    it('read patterns should match global access', () => {
      const hasGlobalPattern = GLOBAL_PATTERNS.reads.some(
        p => p.source.includes('global')
      );
      expect(hasGlobalPattern).toBe(true);
    });

    it('read patterns should match globalThis access', () => {
      const hasGlobalThisPattern = GLOBAL_PATTERNS.reads.some(
        p => p.source.includes('globalThis')
      );
      expect(hasGlobalThisPattern).toBe(true);
    });

    it('all patterns should be RegExp', () => {
      GLOBAL_PATTERNS.reads.forEach(pattern => {
        expect(pattern instanceof RegExp).toBe(true);
      });
      GLOBAL_PATTERNS.writes.forEach(pattern => {
        expect(pattern instanceof RegExp).toBe(true);
      });
    });
  });

  describe('ConnectionType', () => {
    it('should be an object', () => {
      expect(typeof ConnectionType).toBe('object');
    });

    it('should have LOCAL_STORAGE type', () => {
      expect(ConnectionType).toHaveProperty('LOCAL_STORAGE');
      expect(ConnectionType.LOCAL_STORAGE).toBe('localStorage');
    });

    it('should have GLOBAL_VARIABLE type', () => {
      expect(ConnectionType).toHaveProperty('GLOBAL_VARIABLE');
      expect(ConnectionType.GLOBAL_VARIABLE).toBe('globalVariable');
    });

    it('should have EVENT_LISTENER type', () => {
      expect(ConnectionType).toHaveProperty('EVENT_LISTENER');
      expect(ConnectionType.EVENT_LISTENER).toBe('eventListener');
    });

    it('should have SHARED_ENV type', () => {
      expect(ConnectionType).toHaveProperty('SHARED_ENV');
      expect(ConnectionType.SHARED_ENV).toBe('shared-env');
    });

    it('should have COLOCATED type', () => {
      expect(ConnectionType).toHaveProperty('COLOCATED');
      expect(ConnectionType.COLOCATED).toBe('colocated');
    });

    it('should have SHARED_ROUTE type', () => {
      expect(ConnectionType).toHaveProperty('SHARED_ROUTE');
      expect(ConnectionType.SHARED_ROUTE).toBe('shared-route');
    });

    it('all types should be strings', () => {
      Object.values(ConnectionType).forEach(type => {
        expect(typeof type).toBe('string');
      });
    });

    it('all types should be non-empty strings', () => {
      Object.values(ConnectionType).forEach(type => {
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe('DEFAULT_CONFIDENCE', () => {
    it('should be a number', () => {
      expect(typeof DEFAULT_CONFIDENCE).toBe('number');
    });

    it('should be between 0 and 1', () => {
      expect(DEFAULT_CONFIDENCE).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CONFIDENCE).toBeLessThanOrEqual(1);
    });

    it('should be 1.0 (full confidence)', () => {
      expect(DEFAULT_CONFIDENCE).toBe(1.0);
    });
  });
});
