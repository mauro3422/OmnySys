/**
 * @fileoverview redux-extractor.test.js
 * 
 * Tests for redux-extractor.js
 * 
 * @module tests/unit/layer-a-analysis/extractors/state-management/redux/redux-extractor
 */

import { describe, it, expect } from 'vitest';
import {
  extractRedux,
  extractSelectors,
  extractActions,
  extractReducers,
  extractStores,
  extractThunks
} from '#layer-a/extractors/state-management/redux/redux-extractor.js';
import { ReduxBuilder } from '../../../../../factories/state-management-test.factory.js';

describe('Redux Extractor', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export all functions', () => {
      expect(typeof extractRedux).toBe('function');
      expect(typeof extractSelectors).toBe('function');
      expect(typeof extractActions).toBe('function');
      expect(typeof extractReducers).toBe('function');
      expect(typeof extractStores).toBe('function');
      expect(typeof extractThunks).toBe('function');
    });
  });

  // ============================================================================
  // extractRedux
  // ============================================================================
  describe('extractRedux', () => {
    it('should return object with required fields', () => {
      const result = extractRedux('');

      expect(result).toHaveProperty('selectors');
      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('reducers');
      expect(result).toHaveProperty('stores');
      expect(result).toHaveProperty('thunks');
      expect(result).toHaveProperty('all');
    });

    it('should return arrays for all fields', () => {
      const result = extractRedux('');

      expect(Array.isArray(result.selectors)).toBe(true);
      expect(Array.isArray(result.actions)).toBe(true);
      expect(Array.isArray(result.reducers)).toBe(true);
      expect(Array.isArray(result.stores)).toBe(true);
      expect(Array.isArray(result.thunks)).toBe(true);
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should return empty arrays for empty code', () => {
      const result = extractRedux('');

      expect(result.selectors).toHaveLength(0);
      expect(result.actions).toHaveLength(0);
      expect(result.reducers).toHaveLength(0);
      expect(result.stores).toHaveLength(0);
      expect(result.thunks).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should extract complete Redux setup', () => {
      const builder = new ReduxBuilder();
      builder.withAllImports()
        .withSlice('counter')
        .withThunk('fetchData')
        .withStore({ counter: 'counterReducer' })
        .withUseSelector('state.counter.value', 'count');
      const { code } = builder.build();

      const result = extractRedux(code);

      expect(result.selectors.length).toBeGreaterThan(0);
      expect(result.reducers.length).toBeGreaterThan(0);
      expect(result.stores.length).toBeGreaterThan(0);
      expect(result.thunks.length).toBeGreaterThan(0);
    });

    it('should combine all items into all array', () => {
      const builder = new ReduxBuilder();
      builder.withAllImports()
        .withSlice('user')
        .withThunk('fetchUser')
        .withUseSelector('state.user.name');
      const { code } = builder.build();

      const result = extractRedux(code);
      const totalItems = result.selectors.length + result.reducers.length + 
                        result.stores.length + result.thunks.length + result.actions.length;

      expect(result.all.length).toBe(totalItems);
    });
  });

  // ============================================================================
  // extractSelectors
  // ============================================================================
  describe('extractSelectors', () => {
    it('should return empty array for empty code', () => {
      const result = extractSelectors('');
      expect(result).toEqual([]);
    });

    it('should extract useSelector hooks', () => {
      const code = 'const value = useSelector(state => state.counter.value);';
      const result = extractSelectors(code);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should extract connect HOC', () => {
      const code = 'export default connect(mapStateToProps)(Component);';
      const result = extractSelectors(code);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should extract mapStateToProps functions', () => {
      const code = 'const mapStateToProps = (state) => ({ count: state.counter });';
      const result = extractSelectors(code);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // extractActions
  // ============================================================================
  describe('extractActions', () => {
    it('should return empty array for empty code', () => {
      const result = extractActions('');
      expect(result).toEqual([]);
    });

    it('should extract useDispatch hooks', () => {
      const code = 'const dispatch = useDispatch();';
      const result = extractActions(code);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should extract dispatch calls', () => {
      const code = 'dispatch(increment());';
      const result = extractActions(code);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // extractReducers
  // ============================================================================
  describe('extractReducers', () => {
    it('should return empty array for empty code', () => {
      const result = extractReducers('');
      expect(result).toEqual([]);
    });

    it('should extract createSlice definitions', () => {
      const builder = new ReduxBuilder();
      builder.withSliceImports().withSlice('counter');
      const { code } = builder.build();

      const result = extractReducers(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].name).toBe('counter');
    });

    it('should extract multiple slices', () => {
      const builder = new ReduxBuilder();
      builder.withSliceImports()
        .withSlice('counter')
        .withSlice('user');
      const { code } = builder.build();

      const result = extractReducers(code);

      expect(result.length).toBe(2);
    });
  });

  // ============================================================================
  // extractStores
  // ============================================================================
  describe('extractStores', () => {
    it('should return empty array for empty code', () => {
      const result = extractStores('');
      expect(result).toEqual([]);
    });

    it('should extract configureStore', () => {
      const builder = new ReduxBuilder();
      builder.withStoreImports().withStore();
      const { code } = builder.build();

      const result = extractStores(code);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should extract createStore', () => {
      const code = 'const store = createStore(rootReducer);';
      const result = extractStores(code);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // extractThunks
  // ============================================================================
  describe('extractThunks', () => {
    it('should return empty array for empty code', () => {
      const result = extractThunks('');
      expect(result).toEqual([]);
    });

    it('should extract createAsyncThunk', () => {
      const builder = new ReduxBuilder();
      builder.withThunkImports().withThunk('fetchUser');
      const { code } = builder.build();

      const result = extractThunks(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].name).toBe('fetchUser');
    });

    it('should extract multiple thunks', () => {
      const builder = new ReduxBuilder();
      builder.withThunkImports()
        .withThunk('fetchUsers')
        .withThunk('createUser')
        .withThunk('deleteUser');
      const { code } = builder.build();

      const result = extractThunks(code);

      expect(result.length).toBe(3);
    });
  });

  // ============================================================================
  // Integration with Factory
  // ============================================================================
  describe('Integration with Factory', () => {
    it('should work with ReduxBuilder complete setup', () => {
      const builder = new ReduxBuilder();
      builder.withAllImports()
        .withSlice('counter')
        .withThunk('fetchCount')
        .withStore({ counter: 'counterSlice' })
        .withUseSelector('state.counter.value');
      const { code } = builder.build();

      const result = extractRedux(code);

      expect(result.reducers.length).toBeGreaterThan(0);
      expect(result.stores.length).toBeGreaterThan(0);
      expect(result.thunks.length).toBeGreaterThan(0);
    });

    it('should work with ReduxBuilder legacy connect', () => {
      const builder = new ReduxBuilder();
      builder.withLegacyConnectComponent();
      const { code } = builder.build();

      const result = extractSelectors(code);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should work with mapStateToProps builder', () => {
      const builder = new ReduxBuilder();
      builder.withReactReduxImports()
        .withMapStateFunction('mapStateToProps', { user: 'state.user' });
      const { code } = builder.build();

      const result = extractSelectors(code);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle null code', () => {
      expect(() => extractRedux(null)).not.toThrow();
      expect(() => extractSelectors(null)).not.toThrow();
      expect(() => extractReducers(null)).not.toThrow();
    });

    it('should handle undefined code', () => {
      expect(() => extractRedux(undefined)).not.toThrow();
      expect(() => extractActions(undefined)).not.toThrow();
      expect(() => extractStores(undefined)).not.toThrow();
    });

    it('should return empty arrays for invalid code', () => {
      const result = extractRedux('invalid {');

      expect(Array.isArray(result.selectors)).toBe(true);
      expect(Array.isArray(result.actions)).toBe(true);
      expect(Array.isArray(result.reducers)).toBe(true);
    });

    it('should handle whitespace-only code', () => {
      const result = extractRedux('   \n\t   ');

      expect(result.selectors).toHaveLength(0);
      expect(result.reducers).toHaveLength(0);
    });

    it('should handle code with only comments', () => {
      const code = `
        // useSelector(state => state.value)
        /* createSlice() */
      `;
      const result = extractRedux(code);

      expect(result.selectors).toHaveLength(0);
      expect(result.reducers).toHaveLength(0);
    });
  });
});
