/**
 * @fileoverview slice-detector.test.js
 * 
 * Tests for slice-detector.js
 * 
 * @module tests/unit/layer-a-analysis/extractors/state-management/redux/slice-detector
 */

import { describe, it, expect } from 'vitest';
import {
  detectSlices,
  detectStores,
  detectSlicesAndStores
} from '#layer-a/extractors/state-management/redux/slice-detector.js';
import { ReduxType } from '#layer-a/extractors/state-management/constants.js';
import { ReduxBuilder } from '../../../../../factories/state-management-test.factory.js';

describe('Slice Detector', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export all functions', () => {
      expect(typeof detectSlices).toBe('function');
      expect(typeof detectStores).toBe('function');
      expect(typeof detectSlicesAndStores).toBe('function');
    });
  });

  // ============================================================================
  // detectSlices
  // ============================================================================
  describe('detectSlices', () => {
    it('should return empty array for empty code', () => {
      const result = detectSlices('');
      expect(result).toEqual([]);
    });

    it('should detect createSlice', () => {
      const builder = new ReduxBuilder();
      builder.withSliceImports().withSlice('counter');
      const { code } = builder.build();

      const result = detectSlices(code);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ReduxType.CREATE_SLICE);
    });

    it('should extract slice name', () => {
      const builder = new ReduxBuilder();
      builder.withSliceImports().withSlice('userProfile');
      const { code } = builder.build();

      const result = detectSlices(code);

      expect(result[0].name).toBe('userProfile');
    });

    it('should include line number', () => {
      const builder = new ReduxBuilder();
      builder.withSliceImports().withSlice('counter');
      const { code } = builder.build();

      const result = detectSlices(code);

      expect(result[0]).toHaveProperty('line');
      expect(typeof result[0].line).toBe('number');
      expect(result[0].line).toBeGreaterThanOrEqual(1);
    });

    it('should detect multiple slices', () => {
      const builder = new ReduxBuilder();
      builder.withSliceImports()
        .withSlice('counter')
        .withSlice('user')
        .withSlice('theme');
      const { code } = builder.build();

      const result = detectSlices(code);

      expect(result).toHaveLength(3);
    });

    it('should detect slice with complex configuration', () => {
      const code = `
        const userSlice = createSlice({
          name: 'user',
          initialState: { name: '', email: '' },
          reducers: {
            setName: (state, action) => { state.name = action.payload; },
            setEmail: (state, action) => { state.email = action.payload; }
          }
        });
      `;
      const result = detectSlices(code);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('user');
    });

    it('should detect slice with extraReducers', () => {
      const code = `
        const userSlice = createSlice({
          name: 'user',
          initialState: {},
          reducers: {},
          extraReducers: (builder) => {
            builder.addCase(fetchUser.fulfilled, (state, action) => {});
          }
        });
      `;
      const result = detectSlices(code);

      expect(result).toHaveLength(1);
    });
  });

  // ============================================================================
  // detectStores
  // ============================================================================
  describe('detectStores', () => {
    it('should return empty array for empty code', () => {
      const result = detectStores('');
      expect(result).toEqual([]);
    });

    it('should detect configureStore', () => {
      const builder = new ReduxBuilder();
      builder.withStoreImports().withStore();
      const { code } = builder.build();

      const result = detectStores(code);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ReduxType.STORE_CREATION);
    });

    it('should detect createStore', () => {
      const code = 'const store = createStore(rootReducer);';
      const result = detectStores(code);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ReduxType.STORE_CREATION);
    });

    it('should include line number', () => {
      const builder = new ReduxBuilder();
      builder.withStoreImports().withStore();
      const { code } = builder.build();

      const result = detectStores(code);

      expect(result[0]).toHaveProperty('line');
      expect(typeof result[0].line).toBe('number');
    });

    it('should detect configureStore with reducer configuration', () => {
      const code = `
        const store = configureStore({
          reducer: {
            counter: counterReducer,
            user: userReducer
          }
        });
      `;
      const result = detectStores(code);

      expect(result).toHaveLength(1);
    });

    it('should detect configureStore with middleware', () => {
      const code = `
        const store = configureStore({
          reducer: rootReducer,
          middleware: (getDefaultMiddleware) => getDefaultMiddleware()
        });
      `;
      const result = detectStores(code);

      expect(result).toHaveLength(1);
    });

    it('should detect multiple stores', () => {
      const code = `
        const store1 = configureStore({ reducer: reducer1 });
        const store2 = configureStore({ reducer: reducer2 });
      `;
      const result = detectStores(code);

      expect(result).toHaveLength(2);
    });
  });

  // ============================================================================
  // detectSlicesAndStores
  // ============================================================================
  describe('detectSlicesAndStores', () => {
    it('should return object with slices and stores', () => {
      const result = detectSlicesAndStores('');

      expect(result).toHaveProperty('slices');
      expect(result).toHaveProperty('stores');
      expect(Array.isArray(result.slices)).toBe(true);
      expect(Array.isArray(result.stores)).toBe(true);
    });

    it('should return both slices and stores from code', () => {
      const builder = new ReduxBuilder();
      builder.withSliceImports()
        .withStoreImports()
        .withSlice('counter')
        .withStore();
      const { code } = builder.build();

      const result = detectSlicesAndStores(code);

      expect(result.slices.length).toBeGreaterThan(0);
      expect(result.stores.length).toBeGreaterThan(0);
    });

    it('should separate slices from stores correctly', () => {
      const builder = new ReduxBuilder();
      builder.withSliceImports()
        .withStoreImports()
        .withSlice('user')
        .withStore();
      const { code } = builder.build();

      const result = detectSlicesAndStores(code);

      expect(result.slices.every(s => s.type === ReduxType.CREATE_SLICE)).toBe(true);
      expect(result.stores.every(s => s.type === ReduxType.STORE_CREATION)).toBe(true);
    });

    it('should handle code with only slices', () => {
      const builder = new ReduxBuilder();
      builder.withSliceImports().withSlice('counter');
      const { code } = builder.build();

      const result = detectSlicesAndStores(code);

      expect(result.slices.length).toBeGreaterThan(0);
      expect(result.stores).toHaveLength(0);
    });

    it('should handle code with only stores', () => {
      const builder = new ReduxBuilder();
      builder.withStoreImports().withStore();
      const { code } = builder.build();

      const result = detectSlicesAndStores(code);

      expect(result.slices).toHaveLength(0);
      expect(result.stores.length).toBeGreaterThan(0);
    });

    it('should handle multiple slices and stores', () => {
      const code = `
        const counterSlice = createSlice({ name: 'counter', initialState: {}, reducers: {} });
        const userSlice = createSlice({ name: 'user', initialState: {}, reducers: {} });
        const store1 = configureStore({ reducer: {} });
        const store2 = configureStore({ reducer: {} });
      `;
      const result = detectSlicesAndStores(code);

      expect(result.slices).toHaveLength(2);
      expect(result.stores).toHaveLength(2);
    });
  });

  // ============================================================================
  // Integration with Factory
  // ============================================================================
  describe('Integration with Factory', () => {
    it('should work with ReduxBuilder slice', () => {
      const builder = new ReduxBuilder();
      builder.withSliceImports().withSlice('testSlice');
      const { code } = builder.build();

      const result = detectSlices(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].name).toBe('testSlice');
    });

    it('should work with ReduxBuilder store', () => {
      const builder = new ReduxBuilder();
      builder.withStoreImports().withStore();
      const { code } = builder.build();

      const result = detectStores(code);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should work with ReduxBuilder complete setup', () => {
      const builder = new ReduxBuilder();
      builder.withSliceImports()
        .withStoreImports()
        .withSlice('counter')
        .withSlice('user')
        .withStore({ counter: 'counterSlice', user: 'userSlice' });
      const { code } = builder.build();

      const result = detectSlicesAndStores(code);

      expect(result.slices).toHaveLength(2);
      expect(result.stores.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle null code', () => {
      expect(() => detectSlices(null)).not.toThrow();
      expect(() => detectStores(null)).not.toThrow();
      expect(() => detectSlicesAndStores(null)).not.toThrow();
    });

    it('should handle undefined code', () => {
      expect(() => detectSlices(undefined)).not.toThrow();
      expect(() => detectStores(undefined)).not.toThrow();
      expect(() => detectSlicesAndStores(undefined)).not.toThrow();
    });

    it('should return empty arrays for invalid code', () => {
      expect(detectSlices('invalid {')).toEqual([]);
      expect(detectStores('invalid {')).toEqual([]);
      
      const combined = detectSlicesAndStores('invalid {');
      expect(combined.slices).toEqual([]);
      expect(combined.stores).toEqual([]);
    });

    it('should handle whitespace-only code', () => {
      expect(detectSlices('   \n\t   ')).toEqual([]);
      expect(detectStores('   \n\t   ')).toEqual([]);
    });

    it('should handle code with only comments', () => {
      const code = `
        // createSlice({ name: 'test' })
        /* configureStore({}) */
      `;
      expect(detectSlices(code)).toEqual([]);
      expect(detectStores(code)).toEqual([]);
    });
  });
});
