/**
 * @fileoverview State Management Extractor - Tests Funcionales Corregidos
 *
 * Tests para el extractor de estado (Redux, Context, etc.)
 * 
 * @module tests/functional/state-management-extractor.functional.test
 */

import { describe, it, expect } from 'vitest';
import * as stateManagement from '#layer-a/extractors/state-management/index.js';

describe('State Management Extractor - Functional Tests', () => {

  describe('Module Exports', () => {
    it('exports main Redux extraction functions', () => {
      expect(typeof stateManagement.extractRedux).toBe('function');
      expect(typeof stateManagement.extractSelectors).toBe('function');
      expect(typeof stateManagement.extractActions).toBe('function');
      expect(typeof stateManagement.extractReducers).toBe('function');
    });

    it('exports main Context extraction functions', () => {
      expect(typeof stateManagement.extractContext).toBe('function');
      expect(typeof stateManagement.extractContexts).toBe('function');
      expect(typeof stateManagement.extractProviders).toBe('function');
      expect(typeof stateManagement.extractConsumers).toBe('function');
    });

    it('exports connection detection functions', () => {
      expect(typeof stateManagement.detectSelectorConnections).toBe('function');
      expect(typeof stateManagement.detectContextConnections).toBe('function');
      expect(typeof stateManagement.detectStoreStructure).toBe('function');
    });

    it('exports utility functions', () => {
      expect(typeof stateManagement.extractReduxContextFromFile).toBe('function');
      expect(typeof stateManagement.analyzeFiles).toBe('function');
    });
  });

  describe('Redux Extraction', () => {
    it('extracts Redux store configuration', () => {
      const code = `
        import { createStore } from 'redux';
        
        const store = createStore(reducer);
      `;

      const result = stateManagement.extractRedux(code);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('extracts Redux actions', () => {
      const code = `
        export const addTodo = (text) => ({
          type: 'ADD_TODO',
          payload: text
        });
      `;

      const result = stateManagement.extractRedux(code);

      expect(result).toHaveProperty('actions');
      expect(Array.isArray(result.actions)).toBe(true);
    });

    it('extracts Redux reducers', () => {
      const code = `
        const todoReducer = (state = [], action) => {
          switch (action.type) {
            case 'ADD_TODO':
              return [...state, action.payload];
            default:
              return state;
          }
        };
      `;

      const result = stateManagement.extractRedux(code);

      expect(result).toHaveProperty('reducers');
      expect(Array.isArray(result.reducers)).toBe(true);
    });

    it('extracts Redux selectors', () => {
      const code = `
        const selectTodos = state => state.todos;
        const selectTodoById = (state, id) => state.todos.find(t => t.id === id);
      `;

      const result = stateManagement.extractRedux(code);

      expect(result).toHaveProperty('selectors');
      expect(Array.isArray(result.selectors)).toBe(true);
    });

    it('detects Redux hooks usage', () => {
      const code = `
        import { useSelector, useDispatch } from 'react-redux';
        
        function Component() {
          const count = useSelector(state => state.count);
          const dispatch = useDispatch();
        }
      `;

      const result = stateManagement.extractRedux(code);

      expect(result).toBeDefined();
    });

    it('handles Redux Toolkit patterns', () => {
      const code = `
        import { createSlice } from '@reduxjs/toolkit';
        
        const counterSlice = createSlice({
          name: 'counter',
          initialState: { value: 0 },
          reducers: {
            increment: state => { state.value += 1; }
          }
        });
      `;

      const result = stateManagement.extractRedux(code);

      expect(result).toBeDefined();
    });
  });

  describe('Context Extraction', () => {
    it('extracts React Context definitions', () => {
      const code = `
        import { createContext } from 'react';
        
        const UserContext = createContext(null);
      `;

      const result = stateManagement.extractContext(code);

      expect(result).toHaveProperty('contexts');
      expect(Array.isArray(result.contexts)).toBe(true);
    });

    it('extracts Context Providers', () => {
      const code = `
        function UserProvider({ children }) {
          const [user, setUser] = useState(null);
          return (
            <UserContext.Provider value={{ user, setUser }}>
              {children}
            </UserContext.Provider>
          );
        }
      `;

      const result = stateManagement.extractContext(code);

      expect(result).toHaveProperty('providers');
      expect(Array.isArray(result.providers)).toBe(true);
    });

    it('extracts Context Consumers', () => {
      const code = `
        function UserProfile() {
          return (
            <UserContext.Consumer>
              {({ user }) => <div>{user.name}</div>}
            </UserContext.Consumer>
          );
        }
      `;

      const result = stateManagement.extractContext(code);

      expect(result).toHaveProperty('consumers');
      expect(Array.isArray(result.consumers)).toBe(true);
    });

    it('detects useContext hook usage', () => {
      const code = `
        import { useContext } from 'react';
        
        function Component() {
          const theme = useContext(ThemeContext);
          return <div style={{ color: theme.color }} />;
        }
      `;

      const result = stateManagement.extractContext(code);

      expect(result).toBeDefined();
    });
  });

  describe('extractReduxContextFromFile', () => {
    it('extracts complete analysis from a file', () => {
      const code = `
        import { useSelector } from 'react-redux';
        import { createContext } from 'react';
        
        const UserContext = createContext(null);
        
        function Component() {
          const user = useSelector(state => state.user);
        }
      `;

      const result = stateManagement.extractReduxContextFromFile('test.js', code);

      expect(result.filePath).toBe('test.js');
      expect(result.redux).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('analyzeFiles', () => {
    it('analyzes multiple files', () => {
      const files = {
        'store.js': 'export const store = createStore(reducer);',
        'actions.js': 'export const addTodo = () => ({ type: "ADD" });',
        'component.js': "import { addTodo } from './actions';"
      };

      const results = stateManagement.analyzeFiles(files);

      expect(typeof results).toBe('object');
      expect(results['store.js']).toBeDefined();
      expect(results['actions.js']).toBeDefined();
      expect(results['component.js']).toBeDefined();
    });
  });

  describe('Connection Detection', () => {
    it('detectSelectorConnections works with file results', () => {
      const fileResults = {
        'component.js': {
          redux: {
            selectors: [{ body: 'state => state.user', paths: ['user'] }]
          }
        },
        'store.js': {
          redux: {
            slices: [{ name: 'user' }]
          }
        }
      };

      const connections = stateManagement.detectSelectorConnections(fileResults);

      expect(Array.isArray(connections)).toBe(true);
    });

    it('detectContextConnections works with file results', () => {
      const fileResults = {
        'provider.js': {
          context: {
            providers: [{ contextName: 'UserContext' }]
          }
        },
        'consumer.js': {
          context: {
            consumers: [{ contextName: 'UserContext' }]
          }
        }
      };

      const connections = stateManagement.detectContextConnections(fileResults);

      expect(Array.isArray(connections)).toBe(true);
    });

    it('detectStoreStructure analyzes store structure', () => {
      const fileResults = {
        'store.js': {
          redux: {
            stores: [{ name: 'store' }],
            slices: [{ name: 'user' }, { name: 'todos' }]
          }
        }
      };

      const structure = stateManagement.detectStoreStructure(fileResults);

      expect(structure).toBeDefined();
    });
  });

  describe('detectAllReduxContextConnections', () => {
    it('detects all Redux and Context connections', () => {
      const files = {
        'store.js': `
          import { createStore } from 'redux';
          export const store = createStore(reducer);
        `,
        'actions.js': `
          export const addTodo = () => ({ type: "ADD" });
        `,
        'component.js': `
          import { useSelector } from 'react-redux';
          const user = useSelector(state => state.user);
        `
      };

      const result = stateManagement.detectAllReduxContextConnections(files);

      expect(result).toBeDefined();
      expect(result.connections).toBeDefined();
      expect(Array.isArray(result.connections)).toBe(true);
      expect(result.fileResults).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty code', () => {
      const redux = stateManagement.extractRedux('');
      const context = stateManagement.extractContext('');

      expect(redux).toBeDefined();
      expect(context).toBeDefined();
    });

    it('handles code without state management', () => {
      const code = 'const x = 1;';

      const redux = stateManagement.extractRedux(code);
      const context = stateManagement.extractContext(code);

      expect(redux.actions || []).toEqual([]);
      expect(context.contexts || []).toEqual([]);
    });

    it('handles multiple state libraries in same file', () => {
      const code = `
        import { useSelector } from 'react-redux';
        import { useContext } from 'react';
        
        function Component() {
          const reduxState = useSelector(s => s);
          const context = useContext(MyContext);
        }
      `;

      const redux = stateManagement.extractRedux(code);
      const context = stateManagement.extractContext(code);

      expect(redux).toBeDefined();
      expect(context).toBeDefined();
    });

    it('handles malformed state code gracefully', () => {
      const code = 'createSlice({'; // Incomplete

      expect(() => stateManagement.extractRedux(code)).not.toThrow();
    });
  });

  describe('Wrapper Functions', () => {
    it('extractReduxSlices returns slices array', () => {
      const code = `
        import { createSlice } from '@reduxjs/toolkit';
        const userSlice = createSlice({ name: 'user', initialState: {} });
      `;

      const slices = stateManagement.extractReduxSlices(code);

      expect(Array.isArray(slices)).toBe(true);
    });

    it('extractReduxThunks returns thunks array', () => {
      const code = `
        export const fetchUser = createAsyncThunk('user/fetch', async () => {});
      `;

      const thunks = stateManagement.extractReduxThunks(code);

      expect(Array.isArray(thunks)).toBe(true);
    });

    it('extractReduxSelectors returns selectors array', () => {
      const code = `
        const selectUser = state => state.user;
      `;

      const selectors = stateManagement.extractReduxSelectors(code);

      expect(Array.isArray(selectors)).toBe(true);
    });

    it('extractContextProviders returns providers array', () => {
      const code = `
        <UserContext.Provider value={{ user }}>
          {children}
        </UserContext.Provider>
      `;

      const providers = stateManagement.extractContextProviders(code);

      expect(Array.isArray(providers)).toBe(true);
    });

    it('extractContextConsumers returns consumers array', () => {
      const code = `
        <ThemeContext.Consumer>
          {theme => <div>{theme}</div>}
        </ThemeContext.Consumer>
      `;

      const consumers = stateManagement.extractContextConsumers(code);

      expect(Array.isArray(consumers)).toBe(true);
    });

    it('extractStoreStructure returns store info', () => {
      const code = `
        const store = createStore(reducer);
      `;

      const structure = stateManagement.extractStoreStructure(code);

      expect(structure).toBeDefined();
      expect(structure.stores).toBeDefined();
      expect(structure.slices).toBeDefined();
      expect(typeof structure.hasStore).toBe('boolean');
    });
  });
});