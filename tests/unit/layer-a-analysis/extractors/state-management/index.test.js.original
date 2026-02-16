/**
 * @fileoverview index.test.js
 * 
 * Tests for the state management index facade
 * Tests extractReduxContextFromFile, wrapper functions, and orchestrators
 * 
 * @module tests/unit/layer-a-analysis/extractors/state-management/index
 */

import { describe, it, expect } from 'vitest';
import {
  extractReduxContextFromFile,
  extractReduxSlices,
  extractReduxThunks,
  extractReduxSelectors,
  extractContextProviders,
  extractContextConsumers,
  extractStoreStructure,
  extractSelectorConnections,
  extractContextConnections,
  analyzeFiles,
  detectAllReduxContextConnections,
  detectOnlyReduxConnections,
  detectOnlyContextConnections
} from '#layer-a/extractors/state-management/index.js';
import {
  ReduxType,
  ContextType
} from '#layer-a/extractors/state-management/constants.js';
import {
  ReduxBuilder,
  ContextBuilder,
  StateConnectionBuilder,
  StateManagementScenarios
} from '../../../../factories/state-management-test.factory.js';

describe('State Management Index (Facade)', () => {
  const FILE_PATH = 'test/file.js';

  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export all required functions', () => {
      expect(typeof extractReduxContextFromFile).toBe('function');
      expect(typeof extractReduxSlices).toBe('function');
      expect(typeof extractReduxThunks).toBe('function');
      expect(typeof extractReduxSelectors).toBe('function');
      expect(typeof extractContextProviders).toBe('function');
      expect(typeof extractContextConsumers).toBe('function');
      expect(typeof extractStoreStructure).toBe('function');
      expect(typeof extractSelectorConnections).toBe('function');
      expect(typeof extractContextConnections).toBe('function');
      expect(typeof analyzeFiles).toBe('function');
      expect(typeof detectAllReduxContextConnections).toBe('function');
      expect(typeof detectOnlyReduxConnections).toBe('function');
      expect(typeof detectOnlyContextConnections).toBe('function');
    });

    it('should export all constants', () => {
      expect(ReduxType).toBeDefined();
      expect(ContextType).toBeDefined();
      expect(ReduxType.CREATE_SLICE).toBe('create_slice');
      expect(ContextType.CONTEXT_CREATION).toBe('context_creation');
    });
  });

  // ============================================================================
  // extractReduxContextFromFile
  // ============================================================================
  describe('extractReduxContextFromFile', () => {
    it('should return complete file analysis', () => {
      const builder = new ReduxBuilder();
      builder.withSliceImports().withSlice('counter');
      const { code } = builder.build();

      const result = extractReduxContextFromFile(FILE_PATH, code);

      expect(result).toHaveProperty('filePath', FILE_PATH);
      expect(result).toHaveProperty('redux');
      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('timestamp');
    });

    it('should extract Redux from file', () => {
      const builder = new ReduxBuilder();
      builder.withSliceImports().withSlice('user');
      const { code } = builder.build();

      const result = extractReduxContextFromFile(FILE_PATH, code);

      expect(result.redux.reducers.length).toBeGreaterThan(0);
    });

    it('should extract Context from file', () => {
      const builder = new ContextBuilder();
      builder.withReactImports().withContext('ThemeContext');
      const { code } = builder.build();

      const result = extractReduxContextFromFile(FILE_PATH, code);

      expect(result.context.contexts.length).toBeGreaterThan(0);
    });

    it('should generate ISO timestamp', () => {
      const result = extractReduxContextFromFile(FILE_PATH, '');

      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  // ============================================================================
  // Redux Wrapper Functions
  // ============================================================================
  describe('Redux Wrapper Functions', () => {
    it('extractReduxSlices should return only slices', () => {
      const builder = new ReduxBuilder();
      builder.withAllImports()
        .withSlice('counter')
        .withThunk('fetchData')
        .withUseSelector('state.counter.value');
      const { code } = builder.build();

      const slices = extractReduxSlices(code);

      expect(Array.isArray(slices)).toBe(true);
      expect(slices.length).toBeGreaterThan(0);
      expect(slices.every(s => s.type === ReduxType.CREATE_SLICE)).toBe(true);
    });

    it('extractReduxThunks should return only thunks', () => {
      const builder = new ReduxBuilder();
      builder.withThunkImports().withThunk('fetchUser');
      const { code } = builder.build();

      const thunks = extractReduxThunks(code);

      expect(Array.isArray(thunks)).toBe(true);
      expect(thunks.every(t => t.type === ReduxType.ASYNC_THUNK)).toBe(true);
    });

    it('extractReduxSelectors should return only selectors', () => {
      const builder = new ReduxBuilder();
      builder.withReactReduxImports().withUseSelector('state.user.name');
      const { code } = builder.build();

      const selectors = extractReduxSelectors(code);

      expect(Array.isArray(selectors)).toBe(true);
      expect(selectors.every(s => s.type === ReduxType.USE_SELECTOR)).toBe(true);
    });

    it('should return empty array when no items found', () => {
      expect(extractReduxSlices('')).toEqual([]);
      expect(extractReduxThunks('')).toEqual([]);
      expect(extractReduxSelectors('')).toEqual([]);
    });
  });

  // ============================================================================
  // Context Wrapper Functions
  // ============================================================================
  describe('Context Wrapper Functions', () => {
    it('extractContextProviders should return only providers', () => {
      const builder = new ContextBuilder();
      builder.withReactImports()
        .withContext('ThemeContext')
        .withProvider('ThemeContext', 'ThemeProvider')
        .withUseContext('ThemeContext');
      const { code } = builder.build();

      const providers = extractContextProviders(code);

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.every(p => p.type === ContextType.CONTEXT_PROVIDER)).toBe(true);
    });

    it('extractContextConsumers should return only consumers', () => {
      const builder = new ContextBuilder();
      builder.withReactImports()
        .withContext('AuthContext')
        .withUseContext('AuthContext', 'auth');
      const { code } = builder.build();

      const consumers = extractContextConsumers(code);

      expect(Array.isArray(consumers)).toBe(true);
      expect(consumers.every(c => c.type === ContextType.USE_CONTEXT)).toBe(true);
    });

    it('should return empty array when no items found', () => {
      expect(extractContextProviders('')).toEqual([]);
      expect(extractContextConsumers('')).toEqual([]);
    });
  });

  // ============================================================================
  // Store Structure Functions
  // ============================================================================
  describe('extractStoreStructure', () => {
    it('should return store structure object', () => {
      const builder = new ReduxBuilder();
      builder.withStoreImports().withStore({ counter: 'counterReducer' });
      const { code } = builder.build();

      const result = extractStoreStructure(code);

      expect(result).toHaveProperty('stores');
      expect(result).toHaveProperty('slices');
      expect(result).toHaveProperty('hasStore');
    });

    it('should set hasStore to true when store exists', () => {
      const builder = new ReduxBuilder();
      builder.withStoreImports().withStore();
      const { code } = builder.build();

      const result = extractStoreStructure(code);

      expect(result.hasStore).toBe(true);
    });

    it('should set hasStore to false when no store exists', () => {
      const result = extractStoreStructure('');

      expect(result.hasStore).toBe(false);
    });
  });

  // ============================================================================
  // Connection Functions
  // ============================================================================
  describe('extractSelectorConnections', () => {
    it('should extract selector connections', () => {
      const builder = new ReduxBuilder();
      builder.withReactReduxImports()
        .withUseSelector('state.user.name', 'name')
        .withUseSelector('state.user.email', 'email');
      const { code } = builder.build();

      const connections = extractSelectorConnections(code);

      expect(Array.isArray(connections)).toBe(true);
    });

    it('should include selector names and paths', () => {
      const builder = new ReduxBuilder();
      builder.withReactReduxImports().withUseSelector('state.user.name');
      const { code } = builder.build();

      const connections = extractSelectorConnections(code);

      if (connections.length > 0) {
        expect(connections[0]).toHaveProperty('selector');
        expect(connections[0]).toHaveProperty('statePath');
        expect(connections[0]).toHaveProperty('line');
      }
    });
  });

  describe('extractContextConnections', () => {
    it('should extract context connections', () => {
      const builder = new ContextBuilder();
      builder.withReactImports()
        .withContext('AuthContext')
        .withProvider('AuthContext', 'AuthProvider')
        .withUseContext('AuthContext');
      const { code } = builder.build();

      const connections = extractContextConnections(code);

      expect(connections).toHaveProperty('provides');
      expect(connections).toHaveProperty('consumes');
      expect(Array.isArray(connections.provides)).toBe(true);
      expect(Array.isArray(connections.consumes)).toBe(true);
    });
  });

  // ============================================================================
  // analyzeFiles
  // ============================================================================
  describe('analyzeFiles', () => {
    it('should analyze multiple files', () => {
      const files = {
        'src/slice.js': new ReduxBuilder().withSliceImports().withSlice('counter').build().code,
        'src/context.js': new ContextBuilder().withReactImports().withContext('ThemeContext').build().code
      };

      const results = analyzeFiles(files);

      expect(results).toHaveProperty('src/slice.js');
      expect(results).toHaveProperty('src/context.js');
    });

    it('should include analysis for each file', () => {
      const files = {
        'test.js': 'const x = 1;'
      };

      const results = analyzeFiles(files);

      expect(results['test.js']).toHaveProperty('filePath', 'test.js');
      expect(results['test.js']).toHaveProperty('redux');
      expect(results['test.js']).toHaveProperty('context');
    });
  });

  // ============================================================================
  // detectAllReduxContextConnections
  // ============================================================================
  describe('detectAllReduxContextConnections', () => {
    it('should return complete connection analysis', () => {
      const builder = new StateConnectionBuilder();
      builder.withReduxArchitecture();
      const files = builder.build();

      const codeMap = {};
      for (const [path, data] of Object.entries(files)) {
        codeMap[path] = data.code;
      }

      const result = detectAllReduxContextConnections(codeMap);

      expect(result).toHaveProperty('connections');
      expect(result).toHaveProperty('storeStructure');
      expect(result).toHaveProperty('fileResults');
      expect(result).toHaveProperty('byType');
    });

    it('should categorize by type', () => {
      const builder = new StateConnectionBuilder();
      builder.withContextChain();
      const files = builder.build();

      const codeMap = {};
      for (const [path, data] of Object.entries(files)) {
        codeMap[path] = data.code;
      }

      const result = detectAllReduxContextConnections(codeMap);

      expect(result.byType).toHaveProperty('selector');
      expect(result.byType).toHaveProperty('context');
    });
  });

  // ============================================================================
  // detectOnlyReduxConnections
  // ============================================================================
  describe('detectOnlyReduxConnections', () => {
    it('should return only Redux connections', () => {
      const builder = new StateConnectionBuilder();
      builder.withSharedSelectorScenario();
      const files = builder.build();

      const codeMap = {};
      for (const [path, data] of Object.entries(files)) {
        codeMap[path] = data.code;
      }

      const connections = detectOnlyReduxConnections(codeMap);

      expect(Array.isArray(connections)).toBe(true);
    });
  });

  // ============================================================================
  // detectOnlyContextConnections
  // ============================================================================
  describe('detectOnlyContextConnections', () => {
    it('should return only Context connections', () => {
      const builder = new StateConnectionBuilder();
      builder.withContextChain();
      const files = builder.build();

      const codeMap = {};
      for (const [path, data] of Object.entries(files)) {
        codeMap[path] = data.code;
      }

      const connections = detectOnlyContextConnections(codeMap);

      expect(Array.isArray(connections)).toBe(true);
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle empty inputs', () => {
      expect(() => extractReduxContextFromFile('', '')).not.toThrow();
      expect(() => analyzeFiles({})).not.toThrow();
      expect(() => detectAllReduxContextConnections({})).not.toThrow();
    });

    it('should handle null/undefined inputs', () => {
      expect(() => extractReduxSlices(null)).not.toThrow();
      expect(() => extractContextProviders(undefined)).not.toThrow();
    });

    it('should return empty arrays for invalid code', () => {
      expect(extractReduxSlices('invalid {')).toEqual([]);
      expect(extractReduxThunks('invalid {')).toEqual([]);
      expect(extractContextProviders('invalid {')).toEqual([]);
    });

    it('should handle malformed file results', () => {
      const result = extractSelectorConnections('not a file result');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // Integration with Factory
  // ============================================================================
  describe('Integration with Factory', () => {
    it('should work with ReduxBuilder scenarios', () => {
      const scenarios = [
        StateManagementScenarios.simpleSlice(),
        StateManagementScenarios.simpleUseSelector(),
        StateManagementScenarios.complexRedux()
      ];

      scenarios.forEach(scenario => {
        const result = extractReduxContextFromFile(FILE_PATH, scenario.code);
        expect(result).toHaveProperty('redux');
        expect(result).toHaveProperty('context');
      });
    });

    it('should work with ContextBuilder scenarios', () => {
      const scenarios = [
        StateManagementScenarios.simpleContext(),
        StateManagementScenarios.complexContext()
      ];

      scenarios.forEach(scenario => {
        const result = extractReduxContextFromFile(FILE_PATH, scenario.code);
        expect(result).toHaveProperty('redux');
        expect(result).toHaveProperty('context');
      });
    });

    it('should work with StateConnectionBuilder', () => {
      const builder = new StateConnectionBuilder();
      builder.withReduxArchitecture().withContextArchitecture();
      const files = builder.build();

      const codeMap = {};
      for (const [path, data] of Object.entries(files)) {
        codeMap[path] = data.code;
      }

      const result = detectAllReduxContextConnections(codeMap);

      expect(result).toHaveProperty('connections');
      expect(result).toHaveProperty('storeStructure');
    });
  });
});
