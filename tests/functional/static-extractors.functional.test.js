/**
 * @fileoverview Static Extractors - Tests Funcionales Simplificados
 * 
 * Tests funcionales para extractors/static/index.js
 * Verifica que las funciones principales funcionan correctamente
 * 
 * @module tests/functional/static-extractors.functional.test
 */

import { describe, it, expect } from 'vitest';
import * as staticExtractors from '#layer-a/extractors/static/index.js';

describe('Static Extractors - Functional Tests', () => {
  
  it('all expected functions are exported', () => {
    expect(typeof staticExtractors.extractLocalStorageKeys).toBe('function');
    expect(typeof staticExtractors.extractStorageReads).toBe('function');
    expect(typeof staticExtractors.extractStorageWrites).toBe('function');
    expect(typeof staticExtractors.extractEventNames).toBe('function');
    expect(typeof staticExtractors.extractEventListeners).toBe('function');
    expect(typeof staticExtractors.extractEventEmitters).toBe('function');
    expect(typeof staticExtractors.extractGlobalAccess).toBe('function');
    expect(typeof staticExtractors.extractGlobalReads).toBe('function');
    expect(typeof staticExtractors.extractGlobalWrites).toBe('function');
    expect(typeof staticExtractors.detectAllSemanticConnections).toBe('function');
  });

  describe('LocalStorage Extraction', () => {
    it('extractLocalStorageKeys returns structured result', () => {
      const code = `localStorage.setItem('user', data);`;
      
      const result = staticExtractors.extractLocalStorageKeys(code);
      
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('reads');
      expect(result).toHaveProperty('writes');
      expect(result).toHaveProperty('all');
      expect(Array.isArray(result.reads)).toBe(true);
      expect(Array.isArray(result.writes)).toBe(true);
    });

    it('extractStorageReads returns array', () => {
      const code = `const x = localStorage.getItem('key');`;
      
      const result = staticExtractors.extractStorageReads(code);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('extractStorageWrites returns array', () => {
      const code = `localStorage.setItem('key', value);`;
      
      const result = staticExtractors.extractStorageWrites(code);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('handles empty code', () => {
      const result = staticExtractors.extractLocalStorageKeys('');
      
      expect(result.reads).toEqual([]);
      expect(result.writes).toEqual([]);
    });

    it('handles null input safely', () => {
      expect(() => staticExtractors.extractLocalStorageKeys(null)).not.toThrow();
      expect(() => staticExtractors.extractStorageReads(null)).not.toThrow();
    });
  });

  describe('Event Extraction', () => {
    it('extractEventNames returns structured result', () => {
      const code = `document.addEventListener('click', handler);`;
      
      const result = staticExtractors.extractEventNames(code);
      
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('listeners');
      expect(result).toHaveProperty('emitters');
      expect(result).toHaveProperty('all');
    });

    it('extractEventListeners returns array', () => {
      const code = `element.addEventListener('change', fn);`;
      
      const result = staticExtractors.extractEventListeners(code);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('extractEventEmitters returns array', () => {
      const code = `document.dispatchEvent(new Event('load'));`;
      
      const result = staticExtractors.extractEventEmitters(code);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('handles empty code', () => {
      const result = staticExtractors.extractEventNames('');
      
      expect(typeof result).toBe('object');
      expect(result.listeners).toEqual([]);
      expect(result.emitters).toEqual([]);
    });
  });

  describe('Global Variables Extraction', () => {
    it('extractGlobalAccess returns structured result', () => {
      const code = `window.app = {};`;
      
      const result = staticExtractors.extractGlobalAccess(code);
      
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('reads');
      expect(result).toHaveProperty('writes');
      expect(result).toHaveProperty('all');
    });

    it('extractGlobalReads returns array', () => {
      const code = `const x = window.location;`;
      
      const result = staticExtractors.extractGlobalReads(code);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('extractGlobalWrites returns array', () => {
      const code = `document.title = 'Test';`;
      
      const result = staticExtractors.extractGlobalWrites(code);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('handles empty code', () => {
      const result = staticExtractors.extractGlobalAccess('');
      
      expect(typeof result).toBe('object');
      expect(result.reads).toEqual([]);
      expect(result.writes).toEqual([]);
    });
  });

  describe('Semantic Connections', () => {
    it('detectAllSemanticConnections returns structured result', () => {
      const files = {
        'src/a.js': 'localStorage.setItem("key", "value");',
        'src/b.js': 'const x = localStorage.getItem("key");'
      };
      
      const result = staticExtractors.detectAllSemanticConnections(files);
      
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('localStorageConnections');
      expect(result).toHaveProperty('eventConnections');
      expect(result).toHaveProperty('globalConnections');
      expect(result).toHaveProperty('all');
    });

    it('handles empty files object', () => {
      const result = staticExtractors.detectAllSemanticConnections({});
      
      expect(Array.isArray(result.all)).toBe(true);
      expect(result.all.length).toBe(0);
    });

    it('handles empty object', () => {
      const result = staticExtractors.detectAllSemanticConnections({});
      expect(Array.isArray(result.all)).toBe(true);
    });
  });
});
