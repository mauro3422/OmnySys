/**
 * @fileoverview thunk-detector.test.js
 * 
 * Tests for thunk-detector.js
 * 
 * @module tests/unit/layer-a-analysis/extractors/state-management/redux/thunk-detector
 */

import { describe, it, expect } from 'vitest';
import {
  detectUseDispatch,
  detectAsyncThunks,
  detectDispatchCalls,
  detectAllActions
} from '#layer-a/extractors/state-management/redux/thunk-detector.js';
import { ReduxType } from '#layer-a/extractors/state-management/constants.js';
import { ReduxBuilder } from '../../../../../factories/state-management-test.factory.js';

describe('Thunk Detector', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export all functions', () => {
      expect(typeof detectUseDispatch).toBe('function');
      expect(typeof detectAsyncThunks).toBe('function');
      expect(typeof detectDispatchCalls).toBe('function');
      expect(typeof detectAllActions).toBe('function');
    });
  });

  // ============================================================================
  // detectUseDispatch
  // ============================================================================
  describe('detectUseDispatch', () => {
    it('should return empty array for empty code', () => {
      const result = detectUseDispatch('');
      expect(result).toEqual([]);
    });

    it('should detect useDispatch hook', () => {
      const code = 'const dispatch = useDispatch();';
      const result = detectUseDispatch(code);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ReduxType.USE_DISPATCH);
    });

    it('should include line number', () => {
      const code = 'const dispatch = useDispatch();';
      const result = detectUseDispatch(code);

      expect(result[0]).toHaveProperty('line');
      expect(typeof result[0].line).toBe('number');
    });

    it('should detect multiple useDispatch calls', () => {
      const code = `
        const dispatch1 = useDispatch();
        const dispatch2 = useDispatch();
      `;
      const result = detectUseDispatch(code);

      expect(result).toHaveLength(2);
    });

    it('should detect useDispatch with spacing variations', () => {
      const codes = [
        'useDispatch()',
        'useDispatch( )',
        'useDispatch(  )'
      ];

      codes.forEach(code => {
        const result = detectUseDispatch(code);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // detectAsyncThunks
  // ============================================================================
  describe('detectAsyncThunks', () => {
    it('should return empty array for empty code', () => {
      const result = detectAsyncThunks('');
      expect(result).toEqual([]);
    });

    it('should detect createAsyncThunk', () => {
      const builder = new ReduxBuilder();
      builder.withThunkImports().withThunk('fetchUser');
      const { code } = builder.build();

      const result = detectAsyncThunks(code);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ReduxType.ASYNC_THUNK);
    });

    it('should extract thunk name', () => {
      const builder = new ReduxBuilder();
      builder.withThunkImports().withThunk('fetchUserData');
      const { code } = builder.build();

      const result = detectAsyncThunks(code);

      expect(result[0].name).toBe('fetchUserData');
    });

    it('should include line number', () => {
      const builder = new ReduxBuilder();
      builder.withThunkImports().withThunk('fetchUser');
      const { code } = builder.build();

      const result = detectAsyncThunks(code);

      expect(result[0]).toHaveProperty('line');
      expect(typeof result[0].line).toBe('number');
    });

    it('should detect multiple thunks', () => {
      const builder = new ReduxBuilder();
      builder.withThunkImports()
        .withThunk('fetchUsers')
        .withThunk('createUser')
        .withThunk('deleteUser');
      const { code } = builder.build();

      const result = detectAsyncThunks(code);

      expect(result).toHaveLength(3);
    });

    it('should detect thunk with async function', () => {
      const code = `
        const fetchUser = createAsyncThunk(
          'user/fetchUser',
          async (userId, thunkAPI) => {
            const response = await api.getUser(userId);
            return response.data;
          }
        );
      `;
      const result = detectAsyncThunks(code);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('user/fetchUser');
    });

    it('should detect thunk with payload creator', () => {
      const code = `
        const updateUser = createAsyncThunk(
          'user/update',
          async (payload) => {
            return await api.updateUser(payload);
          }
        );
      `;
      const result = detectAsyncThunks(code);

      expect(result).toHaveLength(1);
    });
  });

  // ============================================================================
  // detectDispatchCalls
  // ============================================================================
  describe('detectDispatchCalls', () => {
    it('should return empty array for empty code', () => {
      const result = detectDispatchCalls('');
      expect(result).toEqual([]);
    });

    it('should detect dispatch call', () => {
      const code = 'dispatch(increment());';
      const result = detectDispatchCalls(code);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ReduxType.DISPATCH_CALL);
    });

    it('should extract action name', () => {
      const code = 'dispatch(addTodo({ text: "Hello" }));';
      const result = detectDispatchCalls(code);

      expect(result[0].action).toBe('addTodo');
    });

    it('should include line number', () => {
      const code = 'dispatch(increment());';
      const result = detectDispatchCalls(code);

      expect(result[0]).toHaveProperty('line');
      expect(typeof result[0].line).toBe('number');
    });

    it('should detect multiple dispatch calls', () => {
      const code = `
        dispatch(increment());
        dispatch(decrement());
        dispatch(reset());
      `;
      const result = detectDispatchCalls(code);

      expect(result).toHaveLength(3);
    });

    it('should detect dispatch with thunk', () => {
      const code = 'dispatch(fetchUser(userId));';
      const result = detectDispatchCalls(code);

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('fetchUser');
    });

    it('should detect dispatch in function call chain', () => {
      const code = 'store.dispatch(increment());';
      const result = detectDispatchCalls(code);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // detectAllActions
  // ============================================================================
  describe('detectAllActions', () => {
    it('should return object with required fields', () => {
      const result = detectAllActions('');

      expect(result).toHaveProperty('useDispatches');
      expect(result).toHaveProperty('thunks');
      expect(result).toHaveProperty('dispatchCalls');
      expect(Array.isArray(result.useDispatches)).toBe(true);
      expect(Array.isArray(result.thunks)).toBe(true);
      expect(Array.isArray(result.dispatchCalls)).toBe(true);
    });

    it('should combine all action types', () => {
      const builder = new ReduxBuilder();
      builder.withThunkImports()
        .withThunk('fetchData')
        .withUseDispatch();
      const { code } = builder.build();

      const result = detectAllActions(code);

      expect(result.useDispatches.length).toBeGreaterThan(0);
      expect(result.thunks.length).toBeGreaterThan(0);
    });

    it('should separate action types correctly', () => {
      const builder = new ReduxBuilder();
      builder.withThunkImports()
        .withThunk('fetchUser')
        .withUseDispatch();
      const { code } = builder.build();

      const result = detectAllActions(code);

      expect(result.useDispatches.every(d => d.type === ReduxType.USE_DISPATCH)).toBe(true);
      expect(result.thunks.every(t => t.type === ReduxType.ASYNC_THUNK)).toBe(true);
    });

    it('should handle code with only useDispatch', () => {
      const builder = new ReduxBuilder();
      builder.withReactReduxImports().withUseDispatch();
      const { code } = builder.build();

      const result = detectAllActions(code);

      expect(result.useDispatches.length).toBeGreaterThan(0);
      expect(result.thunks).toHaveLength(0);
    });

    it('should handle code with only thunks', () => {
      const builder = new ReduxBuilder();
      builder.withThunkImports().withThunk('fetchData');
      const { code } = builder.build();

      const result = detectAllActions(code);

      expect(result.useDispatches).toHaveLength(0);
      expect(result.thunks.length).toBeGreaterThan(0);
    });

    it('should include line numbers for all actions', () => {
      const builder = new ReduxBuilder();
      builder.withThunkImports()
        .withThunk('fetchUser')
        .withUseDispatch();
      const { code } = builder.build();

      const result = detectAllActions(code);

      result.useDispatches.forEach(d => {
        expect(d).toHaveProperty('line');
        expect(typeof d.line).toBe('number');
      });
      result.thunks.forEach(t => {
        expect(t).toHaveProperty('line');
        expect(typeof t.line).toBe('number');
      });
    });
  });

  // ============================================================================
  // Integration with Factory
  // ============================================================================
  describe('Integration with Factory', () => {
    it('should work with ReduxBuilder useDispatch', () => {
      const builder = new ReduxBuilder();
      builder.withReactReduxImports().withUseDispatch();
      const { code } = builder.build();

      const result = detectUseDispatch(code);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should work with ReduxBuilder thunk', () => {
      const builder = new ReduxBuilder();
      builder.withThunkImports().withThunk('fetchUser', '/api/user');
      const { code } = builder.build();

      const result = detectAsyncThunks(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].name).toBe('fetchUser');
    });

    it('should work with ReduxBuilder dispatch call', () => {
      const builder = new ReduxBuilder();
      builder.withUseDispatch().withDispatchCall('increment()');
      const { code } = builder.build();

      const result = detectDispatchCalls(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].action).toBe('increment');
    });

    it('should work with ReduxBuilder complete component', () => {
      const builder = new ReduxBuilder();
      builder.withCompleteComponent();
      const { code } = builder.build();

      const result = detectAllActions(code);

      expect(result.useDispatches.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle null code', () => {
      expect(() => detectUseDispatch(null)).not.toThrow();
      expect(() => detectAsyncThunks(null)).not.toThrow();
      expect(() => detectDispatchCalls(null)).not.toThrow();
      expect(() => detectAllActions(null)).not.toThrow();
    });

    it('should handle undefined code', () => {
      expect(() => detectUseDispatch(undefined)).not.toThrow();
      expect(() => detectAsyncThunks(undefined)).not.toThrow();
      expect(() => detectDispatchCalls(undefined)).not.toThrow();
      expect(() => detectAllActions(undefined)).not.toThrow();
    });

    it('should return empty results for invalid code', () => {
      expect(detectUseDispatch('invalid {')).toEqual([]);
      expect(detectAsyncThunks('invalid {')).toEqual([]);
      expect(detectDispatchCalls('invalid {')).toEqual([]);
      
      const all = detectAllActions('invalid {');
      expect(all.useDispatches).toEqual([]);
      expect(all.thunks).toEqual([]);
      expect(all.dispatchCalls).toEqual([]);
    });

    it('should handle whitespace-only code', () => {
      expect(detectUseDispatch('   \n\t   ')).toEqual([]);
      expect(detectAsyncThunks('   \n\t   ')).toEqual([]);
      expect(detectDispatchCalls('   \n\t   ')).toEqual([]);
    });

    it('should handle code with only comments', () => {
      const code = `
        // useDispatch()
        /* createAsyncThunk() */
      `;
      expect(detectUseDispatch(code)).toEqual([]);
      expect(detectAsyncThunks(code)).toEqual([]);
      expect(detectDispatchCalls(code)).toEqual([]);
    });
  });
});
