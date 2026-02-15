/**
 * @fileoverview globals-extractor.test.js
 * 
 * Tests for Globals Extractor
 * Tests extractGlobalAccess, extractGlobalReads, extractGlobalWrites
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/globals-extractor
 */

import { describe, it, expect } from 'vitest';
import {
  extractGlobalAccess,
  extractGlobalReads,
  extractGlobalWrites
} from '#layer-a/extractors/static/globals-extractor.js';
import { GlobalBuilder } from '../../../../factories/static-extractor-test.factory.js';

describe('Globals Extractor', () => {
  describe('extractGlobalAccess', () => {
    it('should extract window property reads', () => {
      const code = 'const config = window.appConfig;';

      const result = extractGlobalAccess(code);

      expect(result.reads).toHaveLength(1);
      expect(result.reads[0].property).toBe('appConfig');
      expect(result.reads[0].type).toBe('read');
    });

    it('should extract window property writes', () => {
      const code = 'window.appState = {};';

      const result = extractGlobalAccess(code);

      expect(result.writes).toHaveLength(1);
      expect(result.writes[0].property).toBe('appState');
      expect(result.writes[0].type).toBe('write');
    });

    it('should extract global property reads', () => {
      const code = 'const data = global.sharedData;';

      const result = extractGlobalAccess(code);

      expect(result.reads.some(r => r.property === 'sharedData')).toBe(true);
    });

    it('should extract global property writes', () => {
      const code = 'global.sharedData = [];';

      const result = extractGlobalAccess(code);

      expect(result.writes.some(w => w.property === 'sharedData')).toBe(true);
    });

    it('should extract globalThis property reads', () => {
      const code = 'const app = globalThis.myApp;';

      const result = extractGlobalAccess(code);

      expect(result.reads.some(r => r.property === 'myApp')).toBe(true);
    });

    it('should extract globalThis property writes', () => {
      const code = 'globalThis.appConfig = {};';

      const result = extractGlobalAccess(code);

      expect(result.writes.some(w => w.property === 'appConfig')).toBe(true);
    });

    it('should filter out native window properties', () => {
      const code = `
        const doc = window.document;
        const loc = window.location;
        const custom = window.myCustomProp;
      `;

      const result = extractGlobalAccess(code);

      expect(result.reads.some(r => r.property === 'document')).toBe(false);
      expect(result.reads.some(r => r.property === 'location')).toBe(false);
      expect(result.reads.some(r => r.property === 'myCustomProp')).toBe(true);
    });

    it('should filter out constructors (capitalized)', () => {
      const code = `
        const arr = window.Array;
        const obj = window.Object;
        const custom = window.MyClass;
      `;

      const result = extractGlobalAccess(code);

      expect(result.reads.some(r => r.property === 'Array')).toBe(false);
      expect(result.reads.some(r => r.property === 'Object')).toBe(false);
    });

    it('should include line numbers', () => {
      const code = `
        const a = window.prop1;
        const b = window.prop2;
      `;

      const result = extractGlobalAccess(code);

      result.all.forEach(access => {
        expect(access.line).toBeGreaterThan(0);
      });
    });

    it('should return reads and writes arrays', () => {
      const code = 'window.test = 1;';

      const result = extractGlobalAccess(code);

      expect(result).toHaveProperty('reads');
      expect(result).toHaveProperty('writes');
      expect(result).toHaveProperty('all');
      expect(Array.isArray(result.reads)).toBe(true);
      expect(Array.isArray(result.writes)).toBe(true);
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should combine reads and writes in all', () => {
      const builder = new GlobalBuilder();
      builder.withWindowRead('prop1', 'a')
        .withWindowWrite('prop2', '1');
      const { code } = builder.build();

      const result = extractGlobalAccess(code);

      expect(result.all.length).toBe(result.reads.length + result.writes.length);
    });

    it('should handle empty code', () => {
      const result = extractGlobalAccess('');

      expect(result.reads).toEqual([]);
      expect(result.writes).toEqual([]);
      expect(result.all).toEqual([]);
    });

    it('should handle code with no global access', () => {
      const code = 'const x = 1; const y = 2;';

      const result = extractGlobalAccess(code);

      expect(result.reads).toEqual([]);
      expect(result.writes).toEqual([]);
    });

    it('should work with GlobalBuilder app state global', () => {
      const builder = new GlobalBuilder();
      builder.withAppStateGlobal();
      const { code } = builder.build();

      const result = extractGlobalAccess(code);

      expect(result.all.length).toBeGreaterThan(0);
      expect(result.reads.length).toBeGreaterThan(0);
      expect(result.writes.length).toBeGreaterThan(0);
    });

    it('should work with GlobalBuilder feature flags', () => {
      const builder = new GlobalBuilder();
      builder.withFeatureFlagsGlobal();
      const { code } = builder.build();

      const result = extractGlobalAccess(code);

      expect(result.all.length).toBeGreaterThan(0);
    });
  });

  describe('extractGlobalReads', () => {
    it('should return unique property names', () => {
      const code = `
        const a = window.prop1;
        const b = window.prop1;
        const c = window.prop2;
      `;

      const result = extractGlobalReads(code);

      expect(result).toContain('prop1');
      expect(result).toContain('prop2');
    });

    it('should return array of strings', () => {
      const code = 'const x = window.test;';

      const result = extractGlobalReads(code);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(prop => {
        expect(typeof prop).toBe('string');
      });
    });

    it('should filter out native properties', () => {
      const code = 'const x = window.document; const y = window.custom;';

      const result = extractGlobalReads(code);

      expect(result).not.toContain('document');
      expect(result).toContain('custom');
    });

    it('should handle empty code', () => {
      const result = extractGlobalReads('');

      expect(result).toEqual([]);
    });
  });

  describe('extractGlobalWrites', () => {
    it('should return unique property names', () => {
      const code = `
        window.prop1 = 1;
        window.prop1 = 2;
        window.prop2 = 3;
      `;

      const result = extractGlobalWrites(code);

      expect(result).toContain('prop1');
      expect(result).toContain('prop2');
    });

    it('should return array of strings', () => {
      const code = 'window.test = 1;';

      const result = extractGlobalWrites(code);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(prop => {
        expect(typeof prop).toBe('string');
      });
    });

    it('should filter out native properties', () => {
      const code = 'window.document = {}; window.custom = {};';

      const result = extractGlobalWrites(code);

      expect(result).not.toContain('document');
      expect(result).toContain('custom');
    });

    it('should handle empty code', () => {
      const result = extractGlobalWrites('');

      expect(result).toEqual([]);
    });
  });

  describe('Multiple global objects', () => {
    it('should handle window, global, and globalThis together', () => {
      const code = `
        const a = window.prop1;
        const b = global.prop2;
        const c = globalThis.prop3;
        window.prop4 = 1;
        global.prop5 = 2;
        globalThis.prop6 = 3;
      `;

      const result = extractGlobalAccess(code);

      expect(result.reads).toHaveLength(3);
      expect(result.writes).toHaveLength(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle null code', () => {
      expect(() => extractGlobalAccess(null)).not.toThrow();
    });

    it('should handle undefined code', () => {
      expect(() => extractGlobalAccess(undefined)).not.toThrow();
    });

    it('should handle complex property names', () => {
      const code = `
        window.__REDUX_DEVTOOLS_EXTENSION__ = {};
        const ext = window.__REDUX_DEVTOOLS_EXTENSION__;
      `;

      const result = extractGlobalAccess(code);

      expect(result.writes.some(w => w.property === '__REDUX_DEVTOOLS_EXTENSION__')).toBe(true);
    });

    it('should handle properties with dollar signs', () => {
      const code = `
        window.$jquery = {};
        const $j = window.$jquery;
      `;

      const result = extractGlobalAccess(code);

      expect(result.writes.some(w => w.property === '$jquery')).toBe(true);
    });

    it('should handle underscore prefixed properties', () => {
      const code = `
        window._private = {};
        const p = window._private;
      `;

      const result = extractGlobalAccess(code);

      expect(result.writes.some(w => w.property === '_private')).toBe(true);
    });
  });
});
