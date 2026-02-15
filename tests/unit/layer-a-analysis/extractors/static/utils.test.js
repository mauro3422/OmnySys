/**
 * @fileoverview utils.test.js
 * 
 * Tests for Static Extractor Utils
 * Tests getLineNumber, isNativeWindowProp, extractMatches
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/utils
 */

import { describe, it, expect } from 'vitest';
import {
  getLineNumber,
  isNativeWindowProp,
  extractMatches
} from '#layer-a/extractors/static/utils.js';
import { NATIVE_WINDOW_PROPS } from '#layer-a/extractors/static/constants.js';

describe('Static Extractor Utils', () => {
  describe('getLineNumber', () => {
    it('should return 1 for position 0', () => {
      const code = 'line 1\nline 2\nline 3';
      
      const result = getLineNumber(code, 0);

      expect(result).toBe(1);
    });

    it('should return correct line number for position', () => {
      const code = 'line 1\nline 2\nline 3';
      
      const result = getLineNumber(code, 7); // Position in line 2

      expect(result).toBe(2);
    });

    it('should handle single line code', () => {
      const code = 'single line';

      const result = getLineNumber(code, 5);

      expect(result).toBe(1);
    });

    it('should handle position at start of line', () => {
      const code = 'line 1\nline 2\nline 3';
      
      const result = getLineNumber(code, 7); // Start of line 2

      expect(result).toBe(2);
    });

    it('should handle position at end of code', () => {
      const code = 'line 1\nline 2';
      
      const result = getLineNumber(code, code.length);

      expect(result).toBe(2);
    });

    it('should handle empty string', () => {
      const result = getLineNumber('', 0);

      expect(result).toBe(1);
    });

    it('should handle code with many lines', () => {
      const code = 'line\n'.repeat(100);
      
      const result = getLineNumber(code, 50 * 5); // Around line 51

      expect(result).toBeGreaterThan(1);
    });
  });

  describe('isNativeWindowProp', () => {
    it('should return true for document', () => {
      expect(isNativeWindowProp('document')).toBe(true);
    });

    it('should return true for location', () => {
      expect(isNativeWindowProp('location')).toBe(true);
    });

    it('should return true for fetch', () => {
      expect(isNativeWindowProp('fetch')).toBe(true);
    });

    it('should return true for Array', () => {
      expect(isNativeWindowProp('Array')).toBe(true);
    });

    it('should return true for Object', () => {
      expect(isNativeWindowProp('Object')).toBe(true);
    });

    it('should return true for Promise', () => {
      expect(isNativeWindowProp('Promise')).toBe(true);
    });

    it('should return true for event handlers (on*)', () => {
      expect(isNativeWindowProp('onclick')).toBe(true);
      expect(isNativeWindowProp('onload')).toBe(true);
      expect(isNativeWindowProp('onerror')).toBe(true);
      expect(isNativeWindowProp('onmessage')).toBe(true);
    });

    it('should return true for constructors (capitalized)', () => {
      expect(isNativeWindowProp('CustomEvent')).toBe(true);
      expect(isNativeWindowProp('Date')).toBe(true);
      expect(isNativeWindowProp('RegExp')).toBe(true);
    });

    it('should return false for custom properties', () => {
      expect(isNativeWindowProp('appState')).toBe(false);
      expect(isNativeWindowProp('myConfig')).toBe(false);
      expect(isNativeWindowProp('customData')).toBe(false);
    });

    it('should return false for underscore prefixed', () => {
      expect(isNativeWindowProp('_private')).toBe(false);
    });

    it('should return false for dollar prefixed', () => {
      expect(isNativeWindowProp('$jquery')).toBe(false);
    });

    it('should return true for all NATIVE_WINDOW_PROPS', () => {
      NATIVE_WINDOW_PROPS.forEach(prop => {
        expect(isNativeWindowProp(prop)).toBe(true);
      });
    });

    it('should be case-sensitive', () => {
      expect(isNativeWindowProp('array')).toBe(false); // lowercase
      expect(isNativeWindowProp('Array')).toBe(true); // capitalized
    });
  });

  describe('extractMatches', () => {
    it('should extract matches with transform', () => {
      const code = 'test1 test2 test3';
      const pattern = /test(\d)/g;
      const transform = (match) => match[1];

      const result = extractMatches(code, pattern, transform);

      expect(result).toEqual(['1', '2', '3']);
    });

    it('should return empty array for no matches', () => {
      const code = 'no matches here';
      const pattern = /xyz/g;
      const transform = (match) => match[0];

      const result = extractMatches(code, pattern, transform);

      expect(result).toEqual([]);
    });

    it('should pass match and code to transform', () => {
      const code = 'test';
      const pattern = /test/g;
      const transform = (match, fullCode) => {
        expect(match[0]).toBe('test');
        expect(fullCode).toBe(code);
        return match[0];
      };

      extractMatches(code, pattern, transform);
    });

    it('should handle multiple captures', () => {
      const code = 'a:1 b:2 c:3';
      const pattern = /(\w):(\d)/g;
      const transform = (match) => ({ key: match[1], value: match[2] });

      const result = extractMatches(code, pattern, transform);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ key: 'a', value: '1' });
    });

    it('should handle complex transform', () => {
      const code = 'key1="value1" key2="value2"';
      const pattern = /(\w+)="([^"]+)"/g;
      const transform = (match) => ({
        key: match[1],
        value: match[2],
        index: match.index
      });

      const result = extractMatches(code, pattern, transform);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('key1');
      expect(result[1].key).toBe('key2');
    });

    it('should handle global flag pattern', () => {
      const code = 'a a a';
      const pattern = /a/g;
      const transform = (match) => match.index;

      const result = extractMatches(code, pattern, transform);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(2);
      expect(result[2]).toBe(4);
    });
  });

  describe('Integration', () => {
    it('getLineNumber should work with real code', () => {
      const code = `
        function test() {
          const x = 1;
          return x;
        }
      `;
      const position = code.indexOf('const x');

      const line = getLineNumber(code, position);

      expect(line).toBe(3);
    });

    it('isNativeWindowProp should filter native properties', () => {
      const properties = ['appState', 'document', 'fetch', 'myConfig', 'Array'];
      const custom = properties.filter(p => !isNativeWindowProp(p));

      expect(custom).toEqual(['appState', 'myConfig']);
    });

    it('extractMatches should work with line numbers', () => {
      const code = `localStorage.setItem('key1', 'value1');
localStorage.setItem('key2', 'value2');`;
      const pattern = /localStorage\.setItem\s*\(\s*['"]([^'"]+)['"]/g;
      const transform = (match, fullCode) => ({
        key: match[1],
        line: getLineNumber(fullCode, match.index)
      });

      const result = extractMatches(code, pattern, transform);

      expect(result).toHaveLength(2);
      expect(result[0].line).toBe(1);
      expect(result[1].line).toBe(2);
    });
  });
});
