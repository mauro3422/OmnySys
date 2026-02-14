/**
 * @fileoverview Tests for function-analyzer.js
 * 
 * @module shared/analysis/__tests__/function-analyzer
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeFunctions,
  hasSideEffects,
  isPureFunction
} from '../function-analyzer/index.js';

describe('function-analyzer', () => {
  describe('analyzeFunctions', () => {
    it('should analyze a simple function', () => {
      const code = `
        function greet(name) {
          return 'Hello ' + name;
        }
      `;
      const fileAnalysis = {
        definitions: [{
          type: 'function',
          name: 'greet',
          line: 2,
          endLine: 4,
          isExported: false,
          params: ['name']
        }],
        imports: []
      };
      
      const result = analyzeFunctions('test.js', code, fileAnalysis);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('greet');
      expect(result[0].params).toEqual(['name']);
      expect(result[0].isAsync).toBe(false);
    });
    
    it('should detect async functions', () => {
      const code = `
        async function fetchData(url) {
          const response = await fetch(url);
          return response.json();
        }
      `;
      const fileAnalysis = {
        definitions: [{
          type: 'function',
          name: 'fetchData',
          line: 2,
          endLine: 5,
          isExported: true,
          params: ['url']
        }],
        imports: []
      };
      
      const result = analyzeFunctions('test.js', code, fileAnalysis);
      
      expect(result[0].isAsync).toBe(true);
      expect(result[0].isExported).toBe(true);
    });
    
    it('should detect global variable access', () => {
      const code = `
        function setGlobal(value) {
          window.config = value;
        }
      `;
      const fileAnalysis = {
        definitions: [{
          type: 'function',
          name: 'setGlobal',
          line: 2,
          endLine: 4,
          isExported: false,
          params: ['value']
        }],
        imports: []
      };
      
      const result = analyzeFunctions('test.js', code, fileAnalysis);
      
      expect(result[0].globalAccess).toHaveLength(1);
      expect(result[0].globalAccess[0].property).toBe('config');
    });
    
    it('should detect localStorage operations', () => {
      const code = `
        function saveToken(token) {
          localStorage.setItem('token', token);
        }
      `;
      const fileAnalysis = {
        definitions: [{
          type: 'function',
          name: 'saveToken',
          line: 2,
          endLine: 4,
          isExported: false,
          params: ['token']
        }],
        imports: []
      };
      
      const result = analyzeFunctions('test.js', code, fileAnalysis);
      
      expect(result[0].localStorageOps).toHaveLength(1);
      expect(result[0].localStorageOps[0].key).toBe('token');
      expect(result[0].localStorageOps[0].type).toBe('write');
    });
    
    it('should detect event operations', () => {
      const code = `
        function setupListener() {
          document.addEventListener('click', handleClick);
        }
      `;
      const fileAnalysis = {
        definitions: [{
          type: 'function',
          name: 'setupListener',
          line: 2,
          endLine: 4,
          isExported: false,
          params: []
        }],
        imports: []
      };
      
      const result = analyzeFunctions('test.js', code, fileAnalysis);
      
      expect(result[0].eventOps).toHaveLength(1);
      expect(result[0].eventOps[0].event).toBe('click');
      expect(result[0].eventOps[0].type).toBe('listen');
    });
  });
  
  describe('hasSideEffects', () => {
    it('should return true for functions with localStorage', () => {
      const funcAnalysis = {
        localStorageOps: [{ key: 'token', type: 'write' }],
        globalAccess: [],
        eventOps: [],
        calls: []
      };
      
      expect(hasSideEffects(funcAnalysis)).toBe(true);
    });
    
    it('should return true for functions with global writes', () => {
      const funcAnalysis = {
        localStorageOps: [],
        globalAccess: [{ property: 'config', isWrite: true }],
        eventOps: [],
        calls: []
      };
      
      expect(hasSideEffects(funcAnalysis)).toBe(true);
    });
    
    it('should return true for functions that emit events', () => {
      const funcAnalysis = {
        localStorageOps: [],
        globalAccess: [],
        eventOps: [{ event: 'update', type: 'emit' }],
        calls: []
      };
      
      expect(hasSideEffects(funcAnalysis)).toBe(true);
    });
    
    it('should return false for pure functions', () => {
      const funcAnalysis = {
        localStorageOps: [],
        globalAccess: [],
        eventOps: [],
        calls: ['parseInt']
      };
      
      expect(hasSideEffects(funcAnalysis)).toBe(false);
    });
  });
  
  describe('isPureFunction', () => {
    it('should return true for pure functions', () => {
      const funcAnalysis = {
        localStorageOps: [],
        globalAccess: [],
        eventOps: []
      };
      
      expect(isPureFunction(funcAnalysis)).toBe(true);
    });
    
    it('should return false for impure functions', () => {
      const funcAnalysis = {
        localStorageOps: [{ key: 'data' }],
        globalAccess: [],
        eventOps: []
      };
      
      expect(isPureFunction(funcAnalysis)).toBe(false);
    });
  });
});
