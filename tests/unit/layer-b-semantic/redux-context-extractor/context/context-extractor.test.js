/**
 * @fileoverview context-extractor.test.js
 * 
 * Tests para extracción de React Context
 * 
 * @module tests/unit/layer-b-semantic/redux-context-extractor/context/context-extractor
 */

import { describe, it, expect } from 'vitest';
import { extractContext } from '#layer-b/redux-context-extractor/context/context-extractor.js';
import { ContextCodeBuilder } from '../../../../factories/layer-b-redux-context/builders.js';

describe('redux-context-extractor/context/context-extractor', () => {
  describe('extractContext', () => {
    it('should return empty result for empty code', () => {
      const result = extractContext('');
      
      expect(result.providers).toEqual([]);
      expect(result.consumers).toEqual([]);
      expect(result.contexts).toEqual([]);
      expect(result.hooks).toEqual([]);
    });

    it('should extract createContext', () => {
      const { code } = ContextCodeBuilder.create()
        .withCreateContext('UserContext')
        .build();
      
      const result = extractContext(code);
      
      expect(result.contexts.length).toBe(1);
      expect(result.contexts[0].type).toBe('context_created');
    });

    it('should extract multiple createContexts', () => {
      const { code } = ContextCodeBuilder.create()
        .withMultipleContexts(['UserContext', 'ThemeContext', 'AuthContext'])
        .build();
      
      const result = extractContext(code);
      
      expect(result.contexts.length).toBe(3);
    });

    it('should extract useContext', () => {
      const { code } = ContextCodeBuilder.create()
        .withUseContext('UserContext')
        .build();
      
      const result = extractContext(code);
      
      expect(result.hooks.length).toBe(1);
      expect(result.hooks[0].type).toBe('use_context');
      expect(result.hooks[0].contextName).toBe('UserContext');
    });

    it('should extract multiple useContexts', () => {
      const { code } = ContextCodeBuilder.create()
        .withUseContext('UserContext')
        .withUseContext('ThemeContext')
        .build();
      
      const result = extractContext(code);
      
      expect(result.hooks.length).toBe(2);
    });

    it('should extract Provider', () => {
      const { code } = ContextCodeBuilder.create()
        .withProvider('UserContext')
        .build();
      
      const result = extractContext(code);
      
      expect(result.providers.length).toBe(1);
      expect(result.providers[0].type).toBe('provider');
      expect(result.providers[0].contextName).toBe('UserContext');
    });

    it('should extract multiple Providers', () => {
      const { code } = ContextCodeBuilder.create()
        .withProvider('UserContext')
        .withProvider('ThemeContext')
        .build();
      
      const result = extractContext(code);
      
      expect(result.providers.length).toBe(2);
    });

    it('should include line numbers', () => {
      const { code } = ContextCodeBuilder.create()
        .withImports()
        .withCreateContext('TestContext')
        .build();
      
      const result = extractContext(code);
      
      expect(result.contexts[0].line).toBeGreaterThan(1);
    });

    it('should handle complete Context component', () => {
      const { code } = ContextCodeBuilder.create()
        .withImports()
        .withCreateContext('UserContext')
        .withProvider('UserContext')
        .withUseContext('UserContext')
        .build();
      
      const result = extractContext(code);
      
      expect(result.contexts.length).toBe(1);
      expect(result.providers.length).toBe(1);
      expect(result.hooks.length).toBe(1);
    });

    it('should handle context with variable name', () => {
      const code = 'const ctx = useContext(MyContext);';
      
      const result = extractContext(code);
      
      expect(result.hooks.length).toBe(1);
      expect(result.hooks[0].contextName).toBe('MyContext');
    });
  });
});
