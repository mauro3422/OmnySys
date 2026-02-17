/**
 * @fileoverview storage-validator.test.js
 * 
 * Tests para validación de localStorage keys
 * 
 * @module tests/unit/layer-b-semantic/validators/validators/storage-validator
 */

import { describe, it, expect } from 'vitest';
import {
  validateLocalStorageKeys,
  filterInvalidStorageKeys,
  calculateStorageConfidence
} from '#layer-b/validators/validators/storage-validator.js';
import { CodeSampleBuilder } from '../../../../factories/layer-b-validators/builders.js';

describe('validators/validators/storage-validator', () => {
  describe('validateLocalStorageKeys', () => {
    it('should return empty array for non-array input', () => {
      expect(validateLocalStorageKeys(null, new Set(['key']))).toEqual([]);
      expect(validateLocalStorageKeys(undefined, new Set(['key']))).toEqual([]);
      expect(validateLocalStorageKeys('string', new Set(['key']))).toEqual([]);
      expect(validateLocalStorageKeys(123, new Set(['key']))).toEqual([]);
    });

    it('should return empty array when no actual keys exist', () => {
      const llmKeys = ['key1', 'key2'];
      expect(validateLocalStorageKeys(llmKeys, new Set())).toEqual([]);
      expect(validateLocalStorageKeys(llmKeys, null)).toEqual([]);
    });

    it('should validate keys that exist in actual keys', () => {
      const llmKeys = ['userSettings', 'appConfig'];
      const actualKeys = new Set(['userSettings', 'appConfig', 'otherKey']);
      
      const result = validateLocalStorageKeys(llmKeys, actualKeys);
      expect(result).toContain('userSettings');
      expect(result).toContain('appConfig');
      expect(result.length).toBe(2);
    });

    it('should filter out keys not in actual keys', () => {
      const llmKeys = ['realKey', 'hallucinatedKey'];
      const actualKeys = new Set(['realKey']);
      
      const result = validateLocalStorageKeys(llmKeys, actualKeys);
      expect(result).toContain('realKey');
      expect(result).not.toContain('hallucinatedKey');
    });

    it('should filter out localStorage methods', () => {
      const llmKeys = ['realKey', 'setItem', 'getItem', 'removeItem', 'clear'];
      const actualKeys = new Set(['realKey', 'setItem']); // setItem is in code but should be filtered
      
      const result = validateLocalStorageKeys(llmKeys, actualKeys);
      expect(result).toContain('realKey');
      expect(result).not.toContain('setItem');
      expect(result).not.toContain('getItem');
      expect(result).not.toContain('removeItem');
      expect(result).not.toContain('clear');
    });

    it('should filter out generic placeholders', () => {
      const llmKeys = ['realKey', 'key1', 'key2', 'key3', 'key4'];
      const actualKeys = new Set(['realKey', 'key1', 'key2']);
      
      const result = validateLocalStorageKeys(llmKeys, actualKeys);
      expect(result).toContain('realKey');
      expect(result).not.toContain('key1');
      expect(result).not.toContain('key2');
      expect(result).not.toContain('key3');
      expect(result).not.toContain('key4');
    });

    it('should handle empty array', () => {
      const actualKeys = new Set(['key']);
      expect(validateLocalStorageKeys([], actualKeys)).toEqual([]);
    });

    it('should handle actual keys from code extraction', () => {
      const { code, localStorageKeys } = new CodeSampleBuilder()
        .withLocalStorageKey('userToken')
        .withLocalStorageKey('sessionData')
        .build();
      
      const llmKeys = ['userToken', 'sessionData', 'fakeKey'];
      const result = validateLocalStorageKeys(llmKeys, localStorageKeys);
      
      expect(result).toContain('userToken');
      expect(result).toContain('sessionData');
      expect(result).not.toContain('fakeKey');
    });
  });

  describe('filterInvalidStorageKeys', () => {
    it('should return empty array for non-array input', () => {
      expect(filterInvalidStorageKeys(null)).toEqual([]);
      expect(filterInvalidStorageKeys(undefined)).toEqual([]);
      expect(filterInvalidStorageKeys('string')).toEqual([]);
    });

    it('should keep valid keys', () => {
      const keys = ['userSettings', 'appConfig', 'sessionData'];
      const result = filterInvalidStorageKeys(keys);
      expect(result).toEqual(keys);
    });

    it('should filter out methods without warning', () => {
      const keys = ['realKey', 'setItem', 'getItem', 'clear', 'key', 'length'];
      const result = filterInvalidStorageKeys(keys);
      expect(result).toContain('realKey');
      expect(result).not.toContain('setItem');
      expect(result).not.toContain('getItem');
      expect(result).not.toContain('clear');
      expect(result).not.toContain('key');
      expect(result).not.toContain('length');
    });

    it('should filter out generic placeholders', () => {
      const keys = ['realKey', 'key1', 'key2', 'key3', 'key4'];
      const result = filterInvalidStorageKeys(keys);
      expect(result).toContain('realKey');
      expect(result).not.toContain('key1');
      expect(result).not.toContain('key2');
      expect(result).not.toContain('key3');
      expect(result).not.toContain('key4');
    });

    it('should handle empty array', () => {
      expect(filterInvalidStorageKeys([])).toEqual([]);
    });

    it('should handle all invalid keys', () => {
      const keys = ['setItem', 'key1', 'getItem', 'key2'];
      const result = filterInvalidStorageKeys(keys);
      expect(result).toEqual([]);
    });
  });

  describe('calculateStorageConfidence', () => {
    it('should return 0 for empty original keys', () => {
      expect(calculateStorageConfidence([], [])).toBe(0);
      expect(calculateStorageConfidence(['key'], [])).toBe(0);
      expect(calculateStorageConfidence(['key'], null)).toBe(0);
    });

    it('should return 1 when all keys are validated', () => {
      const validatedKeys = ['key1', 'key2'];
      const originalKeys = ['key1', 'key2'];
      expect(calculateStorageConfidence(validatedKeys, originalKeys)).toBe(1);
    });

    it('should return 0.5 when half are validated', () => {
      const validatedKeys = ['key1'];
      const originalKeys = ['key1', 'key2'];
      expect(calculateStorageConfidence(validatedKeys, originalKeys)).toBe(0.5);
    });

    it('should return 0 when none are validated', () => {
      const validatedKeys = [];
      const originalKeys = ['key1', 'key2'];
      expect(calculateStorageConfidence(validatedKeys, originalKeys)).toBe(0);
    });

    it('should handle more validated than original', () => {
      const validatedKeys = ['key1', 'key2', 'key3'];
      const originalKeys = ['key1', 'key2'];
      expect(calculateStorageConfidence(validatedKeys, originalKeys)).toBe(1.5);
    });
  });
});
