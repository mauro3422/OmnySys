/**
 * @fileoverview redux-extractor.test.js
 * 
 * Tests para extracción de Redux
 * 
 * @module tests/unit/layer-b-semantic/redux-context-extractor/redux/redux-extractor
 */

import { describe, it, expect } from 'vitest';
import { extractRedux } from '#layer-b/redux-context-extractor/redux/redux-extractor.js';
import { ReduxCodeBuilder } from '../../../../factories/layer-b-redux-context/builders.js';

describe('redux-context-extractor/redux/redux-extractor', () => {
  describe('extractRedux', () => {
    it('should return empty result for empty code', () => {
      const result = extractRedux('');
      
      expect(result.selectors).toEqual([]);
      expect(result.actions).toEqual([]);
      expect(result.reducers).toEqual([]);
      expect(result.stores).toEqual([]);
      expect(result.thunks).toEqual([]);
    });

    it('should extract useSelector', () => {
      const { code } = ReduxCodeBuilder.create()
        .withUseSelector('state => state.user')
        .build();
      
      const result = extractRedux(code);
      
      expect(result.selectors.length).toBe(1);
      expect(result.selectors[0].type).toBe('use_selector');
    });

    it('should extract useSelector with complex path', () => {
      const { code } = ReduxCodeBuilder.create()
        .withComplexSelector()
        .build();
      
      const result = extractRedux(code);
      
      expect(result.selectors.length).toBe(1);
      expect(result.selectors[0].paths).toContain('state.user.profile.name');
    });

    it('should extract multiple useSelectors', () => {
      const { code } = ReduxCodeBuilder.create()
        .withMultipleSelectors()
        .build();
      
      const result = extractRedux(code);
      
      expect(result.selectors.length).toBe(2);
    });

    it('should extract useDispatch', () => {
      const { code } = ReduxCodeBuilder.create()
        .withUseDispatch()
        .build();
      
      const result = extractRedux(code);
      
      expect(result.actions.length).toBe(1);
      expect(result.actions[0].type).toBe('use_dispatch');
    });

    it('should extract createSlice', () => {
      const { code } = ReduxCodeBuilder.create()
        .withCreateSlice('userSlice')
        .build();
      
      const result = extractRedux(code);
      
      expect(result.reducers.length).toBe(1);
      expect(result.reducers[0].type).toBe('create_slice');
      expect(result.reducers[0].name).toBe('userSlice');
    });

    it('should extract configureStore', () => {
      const { code } = ReduxCodeBuilder.create()
        .withConfigureStore()
        .build();
      
      const result = extractRedux(code);
      
      expect(result.stores.length).toBe(1);
      expect(result.stores[0].type).toBe('store');
    });

    it('should extract createStore', () => {
      const { code } = ReduxCodeBuilder.create()
        .withCreateStore()
        .build();
      
      const result = extractRedux(code);
      
      expect(result.stores.length).toBe(1);
      expect(result.stores[0].type).toBe('store');
    });

    it('should extract createAsyncThunk', () => {
      const { code } = ReduxCodeBuilder.create()
        .withCreateAsyncThunk('fetchUser')
        .build();
      
      const result = extractRedux(code);
      
      expect(result.thunks.length).toBe(1);
      expect(result.thunks[0].type).toBe('async_thunk');
      expect(result.thunks[0].name).toBe('fetchUser');
    });

    it('should include line numbers', () => {
      const { code } = ReduxCodeBuilder.create()
        .withImports()
        .withUseDispatch()
        .build();
      
      const result = extractRedux(code);
      
      expect(result.actions[0].line).toBeGreaterThan(1);
    });

    it('should filter out console from selector paths', () => {
      const code = 'const data = useSelector(state => console.log(state.data));';
      
      const result = extractRedux(code);
      
      expect(result.selectors[0].paths).not.toContain('console.log');
    });

    it('should handle complete Redux component', () => {
      const { code } = ReduxCodeBuilder.create()
        .withImports()
        .withUseSelector('state => state.user')
        .withUseDispatch()
        .withCreateSlice('testSlice')
        .withConfigureStore()
        .withCreateAsyncThunk('fetchData')
        .build();
      
      const result = extractRedux(code);
      
      expect(result.selectors.length).toBeGreaterThan(0);
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.reducers.length).toBeGreaterThan(0);
      expect(result.stores.length).toBeGreaterThan(0);
      expect(result.thunks.length).toBeGreaterThan(0);
    });
  });
});
