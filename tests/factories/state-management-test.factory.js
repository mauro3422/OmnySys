/**
 * @fileoverview State Management Test Factory
 * 
 * Factory for creating test data and mock objects for state management extractors.
 * Provides builders for Redux (slices, thunks, selectors) and React Context patterns.
 * 
 * @module tests/factories/state-management-test
 */

/**
 * Builder for creating Redux-related test code
 */
export class ReduxBuilder {
  constructor() {
    this.code = '';
    this.imports = new Set();
    this.slices = [];
    this.thunks = [];
    this.selectors = [];
    this.stores = [];
  }

  /**
   * Add createSlice import
   */
  withSliceImports() {
    this.imports.add("import { createSlice } from '@reduxjs/toolkit';");
    return this;
  }

  /**
   * Add configureStore import
   */
  withStoreImports() {
    this.imports.add("import { configureStore } from '@reduxjs/toolkit';");
    return this;
  }

  /**
   * Add createAsyncThunk import
   */
  withThunkImports() {
    this.imports.add("import { createAsyncThunk } from '@reduxjs/toolkit';");
    return this;
  }

  /**
   * Add react-redux hooks import
   */
  withReactReduxImports() {
    this.imports.add("import { useSelector, useDispatch } from 'react-redux';");
    return this;
  }

  /**
   * Add all Redux imports
   */
  withAllImports() {
    return this.withSliceImports()
      .withStoreImports()
      .withThunkImports()
      .withReactReduxImports();
  }

  /**
   * Create a Redux slice
   * @param {string} name - Slice name
   * @param {Object} options - Slice options
   */
  withSlice(name, options = {}) {
    const initialState = options.initialState || '{}';
    const reducers = options.reducers || '{}';
    
    this.code += `
const ${name}Slice = createSlice({
  name: '${name}',
  initialState: ${initialState},
  reducers: ${reducers}
});

export const { ${options.actions?.join(', ') || ''} } = ${name}Slice.actions;
export default ${name}Slice.reducer;
`;
    this.slices.push({ name, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create an async thunk
   * @param {string} name - Thunk name
   * @param {string} endpoint - API endpoint (optional)
   */
  withThunk(name, endpoint = '/api/data') {
    this.code += `
export const ${name} = createAsyncThunk(
  '${name}',
  async (payload, thunkAPI) => {
    const response = await fetch('${endpoint}');
    return response.json();
  }
);
`;
    this.thunks.push({ name, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create a Redux store
   * @param {Object} reducers - Reducer map
   */
  withStore(reducers = { counter: 'counterReducer' }) {
    const reducerEntries = Object.entries(reducers)
      .map(([key, value]) => `    ${key}: ${value}`)
      .join(',\n');
    
    this.code += `
export const store = configureStore({
  reducer: {
${reducerEntries}
  }
});
`;
    this.stores.push({ line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create useSelector hook usage
   * @param {string} statePath - Path to state (e.g., 'state.counter.value')
   * @param {string} variableName - Variable to assign to
   */
  withUseSelector(statePath, variableName = 'value') {
    this.code += `
const ${variableName} = useSelector(state => ${statePath});
`;
    this.selectors.push({ type: 'useSelector', path: statePath, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create useDispatch hook usage
   */
  withUseDispatch() {
    this.code += `
const dispatch = useDispatch();
`;
    return this;
  }

  /**
   * Create a connect HOC usage
   * @param {string} mapStateFunc - mapStateToProps function name
   * @param {string} mapDispatchFunc - mapDispatchToProps function name (optional)
   */
  withConnectHOC(mapStateFunc = 'mapStateToProps', mapDispatchFunc = null) {
    const secondArg = mapDispatchFunc ? `, ${mapDispatchFunc}` : '';
    this.code += `
export default connect(${mapStateFunc}${secondArg})(MyComponent);
`;
    return this;
  }

  /**
   * Create a mapStateToProps function
   * @param {string} name - Function name
   * @param {Object} mappings - State to props mappings
   */
  withMapStateFunction(name = 'mapStateToProps', mappings = { count: 'state.counter.count' }) {
    const entries = Object.entries(mappings)
      .map(([prop, path]) => `    ${prop}: ${path}`)
      .join(',\n');
    
    this.code += `
const ${name} = (state) => ({
${entries}
});
`;
    this.selectors.push({ type: 'mapState', name, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create a dispatch call
   * @param {string} action - Action to dispatch
   */
  withDispatchCall(action = 'increment()') {
    this.code += `
dispatch(${action});
`;
    return this;
  }

  /**
   * Create complete Redux component
   */
  withCompleteComponent() {
    return this.withAllImports()
      .withUseSelector('state.user.name', 'userName')
      .withUseSelector('state.user.email', 'userEmail')
      .withUseDispatch()
      .withDispatchCall('updateUser({ name: userName })');
  }

  /**
   * Create legacy connect pattern component
   */
  withLegacyConnectComponent() {
    this.withReactReduxImports();
    this.imports.add("import React from 'react';");
    
    this.code += `
class MyComponent extends React.Component {
  render() {
    return <div>{this.props.count}</div>;
  }
}

const mapStateToProps = (state) => ({
  count: state.counter.value
});

export default connect(mapStateToProps)(MyComponent);
`;
    return this;
  }

  estimateLineNumber() {
    return this.code.split('\n').length + this.imports.size + 1;
  }

  build() {
    const imports = Array.from(this.imports).join('\n') + '\n';
    return {
      code: imports + this.code,
      slices: this.slices,
      thunks: this.thunks,
      selectors: this.selectors,
      stores: this.stores
    };
  }
}

/**
 * Builder for creating React Context-related test code
 */
export class ContextBuilder {
  constructor() {
    this.code = '';
    this.imports = new Set();
    this.contexts = [];
    this.providers = [];
    this.consumers = [];
  }

  /**
   * Add React imports
   */
  withReactImports() {
    this.imports.add("import React, { createContext, useContext } from 'react';");
    return this;
  }

  /**
   * Add React 18+ use() hook import
   */
  withReact18Imports() {
    this.imports.add("import { use } from 'react';");
    return this;
  }

  /**
   * Create a context
   * @param {string} name - Context name
   * @param {string} defaultValue - Default context value (optional)
   */
  withContext(name = 'MyContext', defaultValue = 'null') {
    this.code += `
const ${name} = createContext(${defaultValue});
export default ${name};
`;
    this.contexts.push({ name, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create a context with TypeScript generics
   * @param {string} name - Context name
   * @param {string} type - Type parameter
   */
  withTypedContext(name = 'TypedContext', type = 'string') {
    this.code += `
const ${name} = createContext<${type} | null>(null);
`;
    this.contexts.push({ name, typed: true, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create a Provider component
   * @param {string} contextName - Context name
   * @param {string} componentName - Provider component name
   */
  withProvider(contextName = 'MyContext', componentName = 'MyProvider') {
    this.code += `
export const ${componentName} = ({ children }) => {
  const [value, setValue] = useState(null);
  
  return (
    <${contextName}.Provider value={{ value, setValue }}>
      {children}
    </${contextName}.Provider>
  );
};
`;
    this.providers.push({ contextName, componentName, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create useContext hook usage
   * @param {string} contextName - Context name
   * @param {string} variableName - Variable to assign to
   */
  withUseContext(contextName = 'MyContext', variableName = 'contextValue') {
    this.code += `
const ${variableName} = useContext(${contextName});
`;
    this.consumers.push({ type: 'useContext', contextName, variableName, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create React 18+ use() hook usage
   * @param {string} contextName - Context name
   * @param {string} variableName - Variable to assign to
   */
  withUseHook(contextName = 'MyContext', variableName = 'contextValue') {
    this.code += `
const ${variableName} = use(${contextName});
`;
    this.consumers.push({ type: 'use', contextName, variableName, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create Context.Consumer usage
   * @param {string} contextName - Context name
   */
  withConsumerComponent(contextName = 'MyContext') {
    this.code += `
export const ConsumerComponent = () => (
  <${contextName}.Consumer>
    {value => <div>{value}</div>}
  </${contextName}.Consumer>
);
`;
    this.consumers.push({ type: 'Consumer', contextName, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create a complete context file with provider and consumer
   */
  withCompleteContext(contextName = 'AppContext') {
    return this.withReactImports()
      .withContext(contextName)
      .withProvider(contextName, `${contextName}Provider`)
      .withUseContext(contextName, 'contextValue');
  }

  /**
   * Create theme context pattern
   */
  withThemeContext() {
    return this.withReactImports()
      .withContext('ThemeContext', "'light'")
      .withProvider('ThemeContext', 'ThemeProvider')
      .withUseContext('ThemeContext', 'theme');
  }

  /**
   * Create auth context pattern
   */
  withAuthContext() {
    return this.withReactImports()
      .withContext('AuthContext', 'null')
      .withProvider('AuthContext', 'AuthProvider')
      .withUseContext('AuthContext', 'auth');
  }

  /**
   * Create multiple contexts in one file
   * @param {string[]} names - Context names
   */
  withMultipleContexts(names = ['ThemeContext', 'UserContext']) {
    names.forEach(name => this.withContext(name));
    return this;
  }

  estimateLineNumber() {
    return this.code.split('\n').length + this.imports.size + 1;
  }

  build() {
    const imports = Array.from(this.imports).join('\n') + '\n';
    return {
      code: imports + this.code,
      contexts: this.contexts,
      providers: this.providers,
      consumers: this.consumers
    };
  }
}

/**
 * Builder for creating state connection test scenarios
 */
export class StateConnectionBuilder {
  constructor() {
    this.files = new Map();
  }

  /**
   * Add a file with Redux content
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives ReduxBuilder
   */
  withReduxFile(filePath, builderFn) {
    const builder = new ReduxBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Add a file with Context content
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives ContextBuilder
   */
  withContextFile(filePath, builderFn) {
    const builder = new ContextBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Create a Redux store file
   * @param {string} filePath - File path
   * @param {string[]} sliceNames - Slice names
   */
  withStoreFile(filePath = 'store.js', sliceNames = ['counter', 'user']) {
    const builder = new ReduxBuilder();
    builder.withStoreImports();
    
    sliceNames.forEach(name => {
      builder.imports.add(`import ${name}Reducer from './${name}Slice';`);
    });
    
    const reducers = {};
    sliceNames.forEach(name => {
      reducers[name] = `${name}Reducer`;
    });
    
    builder.withStore(reducers);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Create a slice file
   * @param {string} filePath - File path
   * @param {string} sliceName - Slice name
   */
  withSliceFile(filePath, sliceName) {
    const builder = new ReduxBuilder();
    builder.withSliceImports()
      .withSlice(sliceName, {
        actions: [`set${sliceName}`, `update${sliceName}`]
      });
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Create a component using useSelector
   * @param {string} filePath - File path
   * @param {string[]} statePaths - State paths to select
   */
  withSelectorComponent(filePath, statePaths = ['state.user.name']) {
    const builder = new ReduxBuilder();
    builder.withReactReduxImports();
    
    statePaths.forEach((path, i) => {
      builder.withUseSelector(path, `value${i}`);
    });
    
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Create context provider file
   * @param {string} filePath - File path
   * @param {string} contextName - Context name
   */
  withContextProviderFile(filePath, contextName = 'AppContext') {
    const builder = new ContextBuilder();
    builder.withReactImports()
      .withContext(contextName)
      .withProvider(contextName, `${contextName}Provider`);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Create context consumer file
   * @param {string} filePath - File path
   * @param {string} contextName - Context name
   */
  withContextConsumerFile(filePath, contextName = 'AppContext') {
    const builder = new ContextBuilder();
    builder.withReactImports()
      .withUseContext(contextName, 'contextValue');
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Create a complete Redux architecture
   */
  withReduxArchitecture() {
    return this
      .withSliceFile('features/counter/counterSlice.js', 'counter')
      .withSliceFile('features/user/userSlice.js', 'user')
      .withStoreFile('store.js', ['counter', 'user'])
      .withSelectorComponent('components/UserDisplay.js', ['state.user.name', 'state.user.email'])
      .withSelectorComponent('components/CounterDisplay.js', ['state.counter.value']);
  }

  /**
   * Create a complete Context architecture
   */
  withContextArchitecture() {
    return this
      .withContextProviderFile('contexts/AuthContext.js', 'AuthContext')
      .withContextConsumerFile('components/Login.js', 'AuthContext')
      .withContextConsumerFile('components/Profile.js', 'AuthContext');
  }

  /**
   * Create shared selector connection scenario
   * (Multiple files using same state path)
   */
  withSharedSelectorScenario() {
    const sharedPath = 'state.user.id';
    
    this.withSelectorComponent('components/Header.js', [sharedPath]);
    this.withSelectorComponent('components/Profile.js', [sharedPath]);
    this.withSelectorComponent('components/Settings.js', [sharedPath, 'state.user.name']);
    
    return this;
  }

  /**
   * Create context provider-consumer chain
   */
  withContextChain() {
    return this
      .withContextProviderFile('contexts/ThemeContext.js', 'ThemeContext')
      .withContextProviderFile('contexts/LocaleContext.js', 'LocaleContext')
      .withContextConsumerFile('components/ThemeToggle.js', 'ThemeContext')
      .withContextConsumerFile('components/LanguageSelector.js', 'LocaleContext')
      .withContextConsumerFile('components/App.js', 'ThemeContext');
  }

  build() {
    const result = {};
    for (const [path, data] of this.files) {
      result[path] = data;
    }
    return result;
  }

  /**
   * Build as fileResults format (filePath -> {redux, context})
   */
  buildFileResults() {
    const results = {};
    for (const [path, data] of this.files) {
      results[path] = {
        filePath: path,
        redux: {
          selectors: data.selectors || [],
          actions: [],
          reducers: data.slices || [],
          stores: data.stores || [],
          thunks: data.thunks || []
        },
        context: {
          contexts: data.contexts || [],
          providers: data.providers || [],
          consumers: data.consumers || [],
          all: [
            ...(data.contexts || []),
            ...(data.providers || []),
            ...(data.consumers || [])
          ]
        }
      };
    }
    return results;
  }
}

/**
 * Constants for state management testing
 */
export const StateManagementConstants = {
  REDUX_TYPES: {
    USE_SELECTOR: 'use_selector',
    USE_DISPATCH: 'use_dispatch',
    CONNECT_HOC: 'connect_hoc',
    MAP_STATE_FUNCTION: 'map_state_function',
    CREATE_SLICE: 'create_slice',
    STORE_CREATION: 'store_creation',
    ASYNC_THUNK: 'async_thunk',
    DISPATCH_CALL: 'dispatch_call'
  },

  CONTEXT_TYPES: {
    CONTEXT_CREATION: 'context_creation',
    CONTEXT_PROVIDER: 'context_provider',
    USE_CONTEXT: 'use_context',
    CONTEXT_CONSUMER: 'context_consumer',
    USE_CONTEXT_NEW: 'use_context_new'
  },

  CONNECTION_TYPES: {
    SHARED_SELECTOR: 'sharedSelector',
    CONTEXT_USAGE: 'contextUsage'
  },

  DEFAULT_CONFIDENCE: {
    SELECTOR: 0.9,
    CONTEXT: 0.95
  },

  SAMPLE_STATE_PATHS: [
    'state.user.name',
    'state.user.email',
    'state.user.id',
    'state.counter.value',
    'state.todos.items',
    'state.auth.token'
  ]
};

/**
 * Predefined test scenarios
 */
export const StateManagementScenarios = {
  /**
   * Empty file scenario
   */
  emptyFile() {
    return { code: '', redux: {}, context: {} };
  },

  /**
   * Simple useSelector scenario
   */
  simpleUseSelector() {
    const builder = new ReduxBuilder();
    builder.withReactReduxImports()
      .withUseSelector('state.counter.value', 'count');
    return builder.build();
  },

  /**
   * Multiple selectors scenario
   */
  multipleSelectors() {
    const builder = new ReduxBuilder();
    builder.withReactReduxImports()
      .withUseSelector('state.user.name', 'userName')
      .withUseSelector('state.user.email', 'userEmail')
      .withUseSelector('state.todos.items', 'todos');
    return builder.build();
  },

  /**
   * Simple createSlice scenario
   */
  simpleSlice() {
    const builder = new ReduxBuilder();
    builder.withSliceImports()
      .withSlice('counter', {
        initialState: '{ value: 0 }',
        actions: ['increment', 'decrement']
      });
    return builder.build();
  },

  /**
   * Simple context scenario
   */
  simpleContext() {
    const builder = new ContextBuilder();
    builder.withReactImports()
      .withContext('ThemeContext', "'light'")
      .withUseContext('ThemeContext', 'theme');
    return builder.build();
  },

  /**
   * Complex Redux scenario
   */
  complexRedux() {
    const builder = new ReduxBuilder();
    builder.withAllImports()
      .withSlice('user', {
        initialState: '{ name: "", email: "" }',
        actions: ['setUser', 'clearUser']
      })
      .withThunk('fetchUser', '/api/user')
      .withStore({ user: 'userReducer' })
      .withUseSelector('state.user.name', 'userName')
      .withUseDispatch()
      .withDispatchCall('fetchUser()');
    return builder.build();
  },

  /**
   * Complex Context scenario
   */
  complexContext() {
    const builder = new ContextBuilder();
    builder.withReactImports()
      .withContext('AuthContext', 'null')
      .withContext('ThemeContext', "'light'")
      .withProvider('AuthContext', 'AuthProvider')
      .withProvider('ThemeContext', 'ThemeProvider')
      .withUseContext('AuthContext', 'auth')
      .withUseContext('ThemeContext', 'theme')
      .withConsumerComponent('AuthContext');
    return builder.build();
  },

  /**
   * Mixed Redux + Context scenario
   */
  mixedPattern() {
    const redux = new ReduxBuilder();
    redux.withReactReduxImports()
      .withUseSelector('state.user.id', 'userId');

    const context = new ContextBuilder();
    context.withReactImports()
      .withContext('UIContext')
      .withUseContext('UIContext', 'ui');

    const reduxBuilt = redux.build();
    const contextBuilt = context.build();

    return {
      code: reduxBuilt.code + '\n' + contextBuilt.code,
      redux: reduxBuilt,
      context: contextBuilt
    };
  },

  /**
   * Legacy connect HOC scenario
   */
  legacyConnect() {
    const builder = new ReduxBuilder();
    builder.withReactReduxImports()
      .withLegacyConnectComponent();
    return builder.build();
  },

  /**
   * Invalid syntax scenario
   */
  invalidSyntax() {
    return { code: 'const broken = {', error: true };
  }
};

/**
 * Validation helpers for state management results
 */
export const StateManagementValidators = {
  /**
   * Validate extraction result structure
   */
  isValidExtractionResult(result) {
    return result && 
           typeof result === 'object' &&
           (Array.isArray(result.selectors) || Array.isArray(result.slices) || 
            Array.isArray(result.contexts) || Array.isArray(result.providers) ||
            Array.isArray(result.consumers));
  },

  /**
   * Validate slice structure
   */
  isValidSlice(slice) {
    return slice && 
           typeof slice.name === 'string' &&
           typeof slice.type === 'string' &&
           typeof slice.line === 'number';
  },

  /**
   * Validate selector structure
   */
  isValidSelector(selector) {
    return selector && 
           typeof selector.type === 'string' &&
           typeof selector.line === 'number' &&
           (selector.body === undefined || typeof selector.body === 'string');
  },

  /**
   * Validate context structure
   */
  isValidContext(context) {
    return context && 
           typeof context.type === 'string' &&
           typeof context.line === 'number';
  },

  /**
   * Validate connection structure
   */
  isValidConnection(connection) {
    return connection && 
           typeof connection.id === 'string' &&
           typeof connection.sourceFile === 'string' &&
           typeof connection.targetFile === 'string' &&
           typeof connection.type === 'string' &&
           typeof connection.confidence === 'number';
  },

  /**
   * Validate has required Redux fields
   */
  hasReduxFields(result) {
    return result &&
           Array.isArray(result.selectors) &&
           Array.isArray(result.actions) &&
           Array.isArray(result.reducers) &&
           Array.isArray(result.stores) &&
           Array.isArray(result.thunks);
  },

  /**
   * Validate has required Context fields
   */
  hasContextFields(result) {
    return result &&
           Array.isArray(result.contexts) &&
           Array.isArray(result.providers) &&
           Array.isArray(result.consumers);
  }
};

export default {
  ReduxBuilder,
  ContextBuilder,
  StateConnectionBuilder,
  StateManagementConstants,
  StateManagementScenarios,
  StateManagementValidators
};
