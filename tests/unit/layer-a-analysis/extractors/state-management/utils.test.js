/**
 * @fileoverview utils.test.js
 * 
 * Tests for state management utilities
 * 
 * @module tests/unit/layer-a-analysis/extractors/state-management/utils
 */

import { describe, it, expect } from 'vitest';
import {
  getLineNumber,
  extractStatePaths,
  truncate,
  createResult
} from '#layer-a/extractors/state-management/utils.js';

describe('State Management Utils', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export all utility functions', () => {
      expect(typeof getLineNumber).toBe('function');
      expect(typeof extractStatePaths).toBe('function');
      expect(typeof truncate).toBe('function');
      expect(typeof createResult).toBe('function');
    });
  });

  // ============================================================================
  // getLineNumber
  // ============================================================================
  describe('getLineNumber', () => {
    it('should return 1 for position 0', () => {
      const code = 'line 1\nline 2\nline 3';
      expect(getLineNumber(code, 0)).toBe(1);
    });

    it('should return correct line for middle positions', () => {
      const code = 'line 1\nline 2\nline 3';
      expect(getLineNumber(code, 7)).toBe(2); // After first newline
      expect(getLineNumber(code, 14)).toBe(3); // After second newline
    });

    it('should return 1 for single line code', () => {
      const code = 'single line code';
      expect(getLineNumber(code, 10)).toBe(1);
    });

    it('should handle empty string', () => {
      expect(getLineNumber('', 0)).toBe(1);
    });

    it('should handle position at end of code', () => {
      const code = 'line 1\nline 2';
      expect(getLineNumber(code, code.length)).toBe(3); // After last char, new line
    });

    it('should handle position at newline character', () => {
      const code = 'line 1\nline 2';
      expect(getLineNumber(code, 6)).toBe(1); // At \n character
    });

    it('should handle Windows line endings', () => {
      const code = 'line 1\r\nline 2\r\nline 3';
      expect(getLineNumber(code, 10)).toBe(2);
    });

    it('should handle consecutive newlines', () => {
      const code = 'line 1\n\n\nline 4';
      expect(getLineNumber(code, 7)).toBe(2);
      expect(getLineNumber(code, 8)).toBe(3);
      expect(getLineNumber(code, 9)).toBe(4);
    });
  });

  // ============================================================================
  // extractStatePaths
  // ============================================================================
  describe('extractStatePaths', () => {
    it('should extract simple state paths', () => {
      const text = 'state.counter.value';
      const paths = extractStatePaths(text);
      
      expect(paths).toContain('state.counter.value');
    });

    it('should extract multiple state paths', () => {
      const text = 'state.user.name and state.user.email';
      const paths = extractStatePaths(text);
      
      expect(paths).toContain('state.user.name');
      expect(paths).toContain('state.user.email');
    });

    it('should extract nested state paths', () => {
      const text = 'state.app.user.profile.settings.theme';
      const paths = extractStatePaths(text);
      
      expect(paths).toContain('state.app.user.profile.settings.theme');
    });

    it('should filter out console paths', () => {
      const text = 'state.value and console.log(state.value)';
      const paths = extractStatePaths(text);
      
      expect(paths).not.toContain('console.log');
      expect(paths).toContain('state.value');
    });

    it('should return empty array for no paths', () => {
      const text = 'no paths here';
      const paths = extractStatePaths(text);
      
      expect(paths).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const paths = extractStatePaths('');
      expect(paths).toEqual([]);
    });

    it('should require at least one dot in path', () => {
      const text = 'state value simple';
      const paths = extractStatePaths(text);
      
      expect(paths).toEqual([]);
    });

    it('should handle paths with numbers', () => {
      const text = 'state.items.0.name state.items.1.value';
      const paths = extractStatePaths(text);
      
      expect(paths).toContain('state.items.0.name');
      expect(paths).toContain('state.items.1.value');
    });

    it('should handle paths in function parameters', () => {
      const text = 'state => state.user.name';
      const paths = extractStatePaths(text);
      
      expect(paths).toContain('state.user.name');
    });

    it('should not extract single word identifiers', () => {
      const text = 'const x = 5; return x;';
      const paths = extractStatePaths(text);
      
      expect(paths).toEqual([]);
    });
  });

  // ============================================================================
  // truncate
  // ============================================================================
  describe('truncate', () => {
    it('should return original string if within maxLength', () => {
      const str = 'short string';
      const result = truncate(str, 100);
      
      expect(result).toBe(str);
    });

    it('should truncate long strings', () => {
      const str = 'a'.repeat(200);
      const result = truncate(str, 100);
      
      expect(result.length).toBe(103); // 100 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should use default maxLength of 100', () => {
      const str = 'a'.repeat(150);
      const result = truncate(str);
      
      expect(result.length).toBe(103);
    });

    it('should handle empty string', () => {
      expect(truncate('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(truncate(null)).toBe(null);
      expect(truncate(undefined)).toBe(undefined);
    });

    it('should handle exact length strings', () => {
      const str = 'a'.repeat(100);
      const result = truncate(str, 100);
      
      expect(result).toBe(str);
    });

    it('should handle one character over limit', () => {
      const str = 'a'.repeat(101);
      const result = truncate(str, 100);
      
      expect(result.length).toBe(103);
    });

    it('should handle custom maxLength', () => {
      const str = 'a'.repeat(50);
      const result = truncate(str, 20);
      
      expect(result.length).toBe(23);
    });
  });

  // ============================================================================
  // createResult
  // ============================================================================
  describe('createResult', () => {
    it('should create result with type and line', () => {
      const result = createResult('test_type', 42);
      
      expect(result).toHaveProperty('type', 'test_type');
      expect(result).toHaveProperty('line', 42);
    });

    it('should create result with extra properties', () => {
      const result = createResult('slice', 10, { name: 'counter' });
      
      expect(result).toHaveProperty('type', 'slice');
      expect(result).toHaveProperty('line', 10);
      expect(result).toHaveProperty('name', 'counter');
    });

    it('should create result with empty extra object by default', () => {
      const result = createResult('type', 1);
      
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('line');
    });

    it('should merge multiple extra properties', () => {
      const result = createResult('selector', 5, {
        name: 'getUser',
        paths: ['state.user'],
        confidence: 0.9
      });
      
      expect(result).toHaveProperty('type', 'selector');
      expect(result).toHaveProperty('line', 5);
      expect(result).toHaveProperty('name', 'getUser');
      expect(result).toHaveProperty('paths', ['state.user']);
      expect(result).toHaveProperty('confidence', 0.9);
    });

    it('should handle zero line number', () => {
      const result = createResult('type', 0);
      
      expect(result.line).toBe(0);
    });

    it('should handle empty type', () => {
      const result = createResult('', 1);
      
      expect(result.type).toBe('');
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration', () => {
    it('getLineNumber and createResult work together', () => {
      const code = 'line 1\nconst x = useSelector(state => state.value);\nline 3';
      const position = code.indexOf('useSelector');
      const line = getLineNumber(code, position);
      const result = createResult('use_selector', line, { body: 'state => state.value' });
      
      expect(result.line).toBe(2);
      expect(result.type).toBe('use_selector');
    });

    it('extractStatePaths and truncate work together', () => {
      const longPath = 'state.' + 'a.'.repeat(50) + 'value';
      const paths = extractStatePaths(longPath);
      const truncated = truncate(paths[0], 50);
      
      expect(truncated.length).toBeLessThanOrEqual(53);
      expect(truncated.endsWith('...')).toBe(true);
    });

    it('all utilities handle edge cases consistently', () => {
      // Empty/null inputs
      expect(getLineNumber('', 0)).toBe(1);
      expect(extractStatePaths('')).toEqual([]);
      expect(truncate(null)).toBe(null);
      
      // Normal inputs
      expect(getLineNumber('a\nb', 2)).toBe(2);
      expect(extractStatePaths('state.x')).toContain('state.x');
      expect(truncate('short')).toBe('short');
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('getLineNumber should handle position beyond string length', () => {
      const code = 'short';
      const line = getLineNumber(code, 100);
      expect(line).toBe(1);
    });

    it('getLineNumber should handle negative position', () => {
      const code = 'test';
      const line = getLineNumber(code, -1);
      expect(line).toBe(1);
    });

    it('extractStatePaths should handle non-string input', () => {
      expect(() => extractStatePaths(null)).not.toThrow();
      expect(() => extractStatePaths(undefined)).not.toThrow();
      expect(extractStatePaths(null)).toEqual([]);
    });

    it('truncate should handle non-string input gracefully', () => {
      expect(truncate(123)).toBe(123);
      expect(truncate({})).toEqual({});
    });

    it('createResult should handle various extra property types', () => {
      const result1 = createResult('type', 1, null);
      const result2 = createResult('type', 1, undefined);
      const result3 = createResult('type', 1, 'string');
      
      expect(result1).toHaveProperty('type');
      expect(result2).toHaveProperty('type');
      expect(result3).toHaveProperty('type');
    });
  });
});
