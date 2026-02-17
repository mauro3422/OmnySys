/**
 * @fileoverview storage-extractor.test.js
 * 
 * Tests para extracción de localStorage keys
 * 
 * @module tests/unit/layer-b-semantic/validators/extractors/storage-extractor
 */

import { describe, it, expect } from 'vitest';
import {
  extractActualLocalStorageKeys,
  extractValidStorageKeys,
  storageKeyExists
} from '#layer-b/validators/extractors/storage-extractor.js';
import { CodeSampleBuilder } from '../../../../factories/layer-b-validators/builders.js';

describe('validators/extractors/storage-extractor', () => {
  describe('extractActualLocalStorageKeys', () => {
    it('should return empty Set for empty code', () => {
      const result = extractActualLocalStorageKeys('');
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('should extract keys from setItem calls', () => {
      const { code } = new CodeSampleBuilder()
        .withLocalStorageKey('userToken', 'setItem')
        .build();
      
      const result = extractActualLocalStorageKeys(code);
      expect(result.has('userToken')).toBe(true);
    });

    it('should extract keys from getItem calls', () => {
      const { code } = new CodeSampleBuilder()
        .withLocalStorageKey('sessionData', 'getItem')
        .build();
      
      const result = extractActualLocalStorageKeys(code);
      expect(result.has('sessionData')).toBe(true);
    });

    it('should extract keys from removeItem calls', () => {
      const { code } = new CodeSampleBuilder()
        .withLocalStorageKey('tempCache', 'removeItem')
        .build();
      
      const result = extractActualLocalStorageKeys(code);
      expect(result.has('tempCache')).toBe(true);
    });

    it('should extract keys from bracket notation', () => {
      const { code } = new CodeSampleBuilder()
        .withLocalStorageKey('bracketKey', 'bracket')
        .build();
      
      const result = extractActualLocalStorageKeys(code);
      expect(result.has('bracketKey')).toBe(true);
    });

    it('should extract keys from dot notation', () => {
      const { code } = new CodeSampleBuilder()
        .withLocalStorageKey('dotKey', 'dot')
        .build();
      
      const result = extractActualLocalStorageKeys(code);
      expect(result.has('dotKey')).toBe(true);
    });

    it('should filter out localStorage methods', () => {
      const { code } = new CodeSampleBuilder()
        .withLocalStorageKey('validKey')
        .build();
      
      // Add code that references methods
      const codeWithMethods = code + `
        localStorage.setItem('setItem', 'value');
        localStorage.getItem('length');
      `;
      
      const result = extractActualLocalStorageKeys(codeWithMethods);
      expect(result.has('validKey')).toBe(true);
      expect(result.has('setItem')).toBe(false);
      expect(result.has('length')).toBe(false);
    });

    it('should extract multiple different keys', () => {
      const { code } = new CodeSampleBuilder()
        .withLocalStorageKey('key1')
        .withLocalStorageKey('key2')
        .withLocalStorageKey('key3')
        .build();
      
      const result = extractActualLocalStorageKeys(code);
      expect(result.size).toBe(3);
      expect(result.has('key1')).toBe(true);
      expect(result.has('key2')).toBe(true);
      expect(result.has('key3')).toBe(true);
    });

    it('should deduplicate keys', () => {
      const { code } = new CodeSampleBuilder()
        .withLocalStorageKey('duplicateKey')
        .withLocalStorageKey('duplicateKey')
        .withLocalStorageKey('duplicateKey')
        .build();
      
      const result = extractActualLocalStorageKeys(code);
      expect(result.size).toBe(1);
      expect(result.has('duplicateKey')).toBe(true);
    });

    it('should extract keys with various quote styles', () => {
      const code = `
        localStorage.setItem("double-quoted", 1);
        localStorage.setItem('single-quoted', 2);
        localStorage.setItem(\`template-literal\`, 3);
      `;
      
      const result = extractActualLocalStorageKeys(code);
      expect(result.has('double-quoted')).toBe(true);
      expect(result.has('single-quoted')).toBe(true);
      expect(result.has('template-literal')).toBe(true);
    });
  });

  describe('extractValidStorageKeys', () => {
    it('should return array of keys', () => {
      const { code } = new CodeSampleBuilder()
        .withLocalStorageKey('key1')
        .withLocalStorageKey('key2')
        .build();
      
      const result = extractValidStorageKeys(code);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('key1');
      expect(result).toContain('key2');
    });

    it('should return empty array for code without localStorage', () => {
      const result = extractValidStorageKeys('const x = 5; console.log(x);');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('storageKeyExists', () => {
    it('should return true for existing key', () => {
      const { code } = new CodeSampleBuilder()
        .withLocalStorageKey('existingKey')
        .build();
      
      expect(storageKeyExists('existingKey', code)).toBe(true);
    });

    it('should return false for non-existing key', () => {
      const { code } = new CodeSampleBuilder()
        .withLocalStorageKey('otherKey')
        .build();
      
      expect(storageKeyExists('nonExistingKey', code)).toBe(false);
    });

    it('should return false for methods', () => {
      const code = 'localStorage.setItem("realKey", "value");';
      expect(storageKeyExists('setItem', code)).toBe(false);
      expect(storageKeyExists('getItem', code)).toBe(false);
      expect(storageKeyExists('clear', code)).toBe(false);
    });
  });
});
