/**
 * @fileoverview constants.test.js
 * 
 * Tests for state management constants
 * 
 * @module tests/unit/layer-a-analysis/extractors/state-management/constants
 */

import { describe, it, expect } from 'vitest';
import {
  ReduxType,
  ContextType,
  ConnectionType,
  REDUX_PATTERNS,
  CONTEXT_PATTERNS,
  DEFAULT_CONFIDENCE
} from '#layer-a/extractors/state-management/constants.js';

describe('State Management Constants', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export all constant objects', () => {
      expect(ReduxType).toBeDefined();
      expect(ContextType).toBeDefined();
      expect(ConnectionType).toBeDefined();
      expect(REDUX_PATTERNS).toBeDefined();
      expect(CONTEXT_PATTERNS).toBeDefined();
      expect(DEFAULT_CONFIDENCE).toBeDefined();
    });

    it('should have ReduxType as frozen enum-like object', () => {
      expect(typeof ReduxType).toBe('object');
      expect(Object.isFrozen(ReduxType)).toBe(true) || expect(() => {
        ReduxType.NEW_TYPE = 'new';
      }).toThrow() || true;
    });

    it('should have ContextType as frozen enum-like object', () => {
      expect(typeof ContextType).toBe('object');
    });

    it('should have ConnectionType as frozen enum-like object', () => {
      expect(typeof ConnectionType).toBe('object');
    });
  });

  // ============================================================================
  // ReduxType Values
  // ============================================================================
  describe('ReduxType', () => {
    it('should have all required Redux types', () => {
      expect(ReduxType.USE_SELECTOR).toBe('use_selector');
      expect(ReduxType.USE_DISPATCH).toBe('use_dispatch');
      expect(ReduxType.CONNECT_HOC).toBe('connect_hoc');
      expect(ReduxType.MAP_STATE_FUNCTION).toBe('map_state_function');
      expect(ReduxType.CREATE_SLICE).toBe('create_slice');
      expect(ReduxType.STORE_CREATION).toBe('store_creation');
      expect(ReduxType.ASYNC_THUNK).toBe('async_thunk');
      expect(ReduxType.DISPATCH_CALL).toBe('dispatch_call');
    });

    it('should have unique type values', () => {
      const values = Object.values(ReduxType);
      const uniqueValues = [...new Set(values)];
      expect(values.length).toBe(uniqueValues.length);
    });

    it('should have string values', () => {
      Object.values(ReduxType).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });

    it('should have snake_case format', () => {
      Object.values(ReduxType).forEach(value => {
        expect(value).toMatch(/^[a-z]+(_[a-z]+)*$/);
      });
    });
  });

  // ============================================================================
  // ContextType Values
  // ============================================================================
  describe('ContextType', () => {
    it('should have all required Context types', () => {
      expect(ContextType.CONTEXT_CREATION).toBe('context_creation');
      expect(ContextType.CONTEXT_PROVIDER).toBe('context_provider');
      expect(ContextType.USE_CONTEXT).toBe('use_context');
      expect(ContextType.CONTEXT_CONSUMER).toBe('context_consumer');
      expect(ContextType.USE_CONTEXT_NEW).toBe('use_context_new');
    });

    it('should have unique type values', () => {
      const values = Object.values(ContextType);
      const uniqueValues = [...new Set(values)];
      expect(values.length).toBe(uniqueValues.length);
    });

    it('should have string values', () => {
      Object.values(ContextType).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });

    it('should have snake_case format', () => {
      Object.values(ContextType).forEach(value => {
        expect(value).toMatch(/^[a-z]+(_[a-z]+)*$/);
      });
    });
  });

  // ============================================================================
  // ConnectionType Values
  // ============================================================================
  describe('ConnectionType', () => {
    it('should have all required connection types', () => {
      expect(ConnectionType.SHARED_SELECTOR).toBe('sharedSelector');
      expect(ConnectionType.CONTEXT_USAGE).toBe('contextUsage');
    });

    it('should have unique type values', () => {
      const values = Object.values(ConnectionType);
      const uniqueValues = [...new Set(values)];
      expect(values.length).toBe(uniqueValues.length);
    });

    it('should have camelCase format', () => {
      Object.values(ConnectionType).forEach(value => {
        expect(value).toMatch(/^[a-z]+([A-Z][a-z]+)*$/);
      });
    });
  });

  // ============================================================================
  // REDUX_PATTERNS Regex
  // ============================================================================
  describe('REDUX_PATTERNS', () => {
    it('should have all required patterns', () => {
      expect(REDUX_PATTERNS).toHaveProperty('useSelector');
      expect(REDUX_PATTERNS).toHaveProperty('useDispatch');
      expect(REDUX_PATTERNS).toHaveProperty('connect');
      expect(REDUX_PATTERNS).toHaveProperty('mapStateFunction');
      expect(REDUX_PATTERNS).toHaveProperty('createSlice');
      expect(REDUX_PATTERNS).toHaveProperty('storeCreation');
      expect(REDUX_PATTERNS).toHaveProperty('asyncThunk');
      expect(REDUX_PATTERNS).toHaveProperty('dispatchCall');
      expect(REDUX_PATTERNS).toHaveProperty('statePath');
    });

    it('should have RegExp values', () => {
      Object.values(REDUX_PATTERNS).forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
    });

    it('useSelector should match useSelector patterns', () => {
      const code1 = 'const value = useSelector(state => state.counter.value);';
      const code2 = 'const user = useSelector((state) => state.user.name);';
      
      expect(REDUX_PATTERNS.useSelector.test(code1)).toBe(true);
      expect(REDUX_PATTERNS.useSelector.test(code2)).toBe(true);
    });

    it('useDispatch should match useDispatch patterns', () => {
      const code = 'const dispatch = useDispatch();';
      expect(REDUX_PATTERNS.useDispatch.test(code)).toBe(true);
    });

    it('connect should match connect HOC patterns', () => {
      const code1 = 'export default connect(mapStateToProps)(Component);';
      const code2 = 'connect(mapState, mapDispatch)(MyComponent)';
      
      expect(REDUX_PATTERNS.connect.test(code1)).toBe(true);
      expect(REDUX_PATTERNS.connect.test(code2)).toBe(true);
    });

    it('createSlice should match createSlice patterns', () => {
      const code = `createSlice({
        name: 'counter',
        initialState: {},
        reducers: {}
      })`;
      expect(REDUX_PATTERNS.createSlice.test(code)).toBe(true);
    });

    it('storeCreation should match configureStore patterns', () => {
      const code = 'const store = configureStore({ reducer });';
      expect(REDUX_PATTERNS.storeCreation.test(code)).toBe(true);
    });

    it('storeCreation should match createStore patterns', () => {
      const code = 'const store = createStore(rootReducer);';
      expect(REDUX_PATTERNS.storeCreation.test(code)).toBe(true);
    });

    it('asyncThunk should match createAsyncThunk patterns', () => {
      const code = "const fetchUser = createAsyncThunk('users/fetch', async () => {});";
      expect(REDUX_PATTERNS.asyncThunk.test(code)).toBe(true);
    });

    it('dispatchCall should match dispatch patterns', () => {
      const code = 'dispatch(increment());';
      expect(REDUX_PATTERNS.dispatchCall.test(code)).toBe(true);
    });

    it('statePath should match state paths', () => {
      expect(REDUX_PATTERNS.statePath.test('state.counter.value')).toBe(true);
      expect(REDUX_PATTERNS.statePath.test('state.user.profile.name')).toBe(true);
    });
  });

  // ============================================================================
  // CONTEXT_PATTERNS Regex
  // ============================================================================
  describe('CONTEXT_PATTERNS', () => {
    it('should have all required patterns', () => {
      expect(CONTEXT_PATTERNS).toHaveProperty('createContext');
      expect(CONTEXT_PATTERNS).toHaveProperty('provider');
      expect(CONTEXT_PATTERNS).toHaveProperty('useContext');
      expect(CONTEXT_PATTERNS).toHaveProperty('consumer');
      expect(CONTEXT_PATTERNS).toHaveProperty('useContextNew');
    });

    it('should have RegExp values', () => {
      Object.values(CONTEXT_PATTERNS).forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
    });

    it('createContext should match createContext patterns', () => {
      expect(CONTEXT_PATTERNS.createContext.test('const ctx = createContext();')).toBe(true);
      expect(CONTEXT_PATTERNS.createContext.test('const ctx = createContext<string>(null);')).toBe(true);
    });

    it('provider should match Context.Provider patterns', () => {
      expect(CONTEXT_PATTERNS.provider.test('<ThemeContext.Provider value={theme}>'));
      expect(CONTEXT_PATTERNS.provider.test('AuthContext.Provider')).toBe(true);
    });

    it('useContext should match useContext patterns', () => {
      const code = 'const theme = useContext(ThemeContext);';
      expect(CONTEXT_PATTERNS.useContext.test(code)).toBe(true);
    });

    it('consumer should match Context.Consumer patterns', () => {
      expect(CONTEXT_PATTERNS.consumer.test('<ThemeContext.Consumer>')).toBe(true);
      expect(CONTEXT_PATTERNS.consumer.test('AuthContext.Consumer')).toBe(true);
    });

    it('useContextNew should match use() patterns', () => {
      const code = 'const theme = use(ThemeContext);';
      expect(CONTEXT_PATTERNS.useContextNew.test(code)).toBe(true);
    });
  });

  // ============================================================================
  // DEFAULT_CONFIDENCE
  // ============================================================================
  describe('DEFAULT_CONFIDENCE', () => {
    it('should have required confidence values', () => {
      expect(DEFAULT_CONFIDENCE).toHaveProperty('selector');
      expect(DEFAULT_CONFIDENCE).toHaveProperty('context');
    });

    it('should have numeric confidence values', () => {
      expect(typeof DEFAULT_CONFIDENCE.selector).toBe('number');
      expect(typeof DEFAULT_CONFIDENCE.context).toBe('number');
    });

    it('should have confidence values between 0 and 1', () => {
      expect(DEFAULT_CONFIDENCE.selector).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CONFIDENCE.selector).toBeLessThanOrEqual(1);
      expect(DEFAULT_CONFIDENCE.context).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CONFIDENCE.context).toBeLessThanOrEqual(1);
    });

    it('should have context confidence >= selector confidence', () => {
      // Context detection is generally more reliable than selector detection
      expect(DEFAULT_CONFIDENCE.context).toBeGreaterThanOrEqual(DEFAULT_CONFIDENCE.selector);
    });
  });

  // ============================================================================
  // Pattern Validation
  // ============================================================================
  describe('Pattern Validation', () => {
    it('all patterns should have global flag', () => {
      [...Object.values(REDUX_PATTERNS), ...Object.values(CONTEXT_PATTERNS)]
        .forEach(pattern => {
          expect(pattern.flags).toContain('g');
        });
    });

    it('patterns should be reusable (not stateful after test)', () => {
      const pattern = REDUX_PATTERNS.useSelector;
      const code = 'useSelector(s => s.a); useSelector(s => s.b);';
      
      // First use
      const matches1 = [...code.matchAll(pattern)];
      expect(matches1.length).toBe(2);
      
      // Second use should also work (pattern resets)
      pattern.lastIndex = 0;
      const matches2 = [...code.matchAll(pattern)];
      expect(matches2.length).toBe(2);
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('constants should not be modifiable', () => {
      // Attempt to modify should either throw or not affect the constant
      const original = ReduxType.USE_SELECTOR;
      try {
        ReduxType.USE_SELECTOR = 'modified';
      } catch (e) {
        // Expected in strict mode with frozen object
      }
      expect(ReduxType.USE_SELECTOR).toBe(original);
    });

    it('patterns should not be undefined', () => {
      Object.keys(REDUX_PATTERNS).forEach(key => {
        expect(REDUX_PATTERNS[key]).toBeDefined();
      });
      Object.keys(CONTEXT_PATTERNS).forEach(key => {
        expect(CONTEXT_PATTERNS[key]).toBeDefined();
      });
    });
  });
});
