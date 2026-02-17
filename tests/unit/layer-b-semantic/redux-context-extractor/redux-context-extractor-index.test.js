/**
 * @fileoverview redux-context-extractor-index.test.js
 * 
 * Tests para el facade principal del redux-context-extractor
 * 
 * @module tests/unit/layer-b-semantic/redux-context-extractor/index
 */

import { describe, it, expect } from 'vitest';
import {
  extractRedux,
  extractContext,
  extractReduxAndContext,
  getLineNumber
} from '#layer-b/redux-context-extractor/index.js';
import { MixedCodeBuilder } from '../../../factories/layer-b-redux-context/builders.js';

describe('redux-context-extractor/index', () => {
  describe('exports', () => {
    it('should export extractRedux', () => {
      expect(typeof extractRedux).toBe('function');
    });

    it('should export extractContext', () => {
      expect(typeof extractContext).toBe('function');
    });

    it('should export extractReduxAndContext', () => {
      expect(typeof extractReduxAndContext).toBe('function');
    });

    it('should export getLineNumber', () => {
      expect(typeof getLineNumber).toBe('function');
    });
  });

  describe('extractReduxAndContext', () => {
    it('should extract both redux and context', () => {
      const { code } = MixedCodeBuilder.create()
        .withRedux('const dispatch = useDispatch();')
        .withContext('const ctx = createContext();')
        .build();
      
      const result = extractReduxAndContext(code);
      
      expect(result).toHaveProperty('redux');
      expect(result).toHaveProperty('context');
    });

    it('should extract redux correctly', () => {
      const { code } = MixedCodeBuilder.create()
        .withRedux('const dispatch = useDispatch();')
        .build();
      
      const result = extractReduxAndContext(code);
      
      expect(result.redux.actions.length).toBeGreaterThan(0);
    });

    it('should extract context correctly', () => {
      const { code } = MixedCodeBuilder.create()
        .withContext('const ctx = createContext();')
        .build();
      
      const result = extractReduxAndContext(code);
      
      expect(result.context.contexts.length).toBeGreaterThan(0);
    });

    it('should handle empty code', () => {
      const result = extractReduxAndContext('');
      
      expect(result.redux.selectors).toEqual([]);
      expect(result.redux.actions).toEqual([]);
      expect(result.context.contexts).toEqual([]);
      expect(result.context.hooks).toEqual([]);
    });

    it('should handle code with neither redux nor context', () => {
      const code = 'const x = 1;\nconst y = 2;';
      
      const result = extractReduxAndContext(code);
      
      expect(result.redux.selectors).toEqual([]);
      expect(result.redux.actions).toEqual([]);
      expect(result.redux.reducers).toEqual([]);
      expect(result.redux.stores).toEqual([]);
      expect(result.redux.thunks).toEqual([]);
      expect(result.context.providers).toEqual([]);
      expect(result.context.consumers).toEqual([]);
      expect(result.context.contexts).toEqual([]);
      expect(result.context.hooks).toEqual([]);
    });
  });
});
