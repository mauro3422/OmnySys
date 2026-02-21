/**
 * @fileoverview Redux Builder
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

  static create() {
    return new ReduxBuilder();
  }

  withSliceImports() {
    this.imports.add("import { createSlice } from '@reduxjs/toolkit';");
    return this;
  }

  withStoreImports() {
    this.imports.add("import { configureStore } from '@reduxjs/toolkit';");
    return this;
  }

  withThunkImports() {
    this.imports.add("import { createAsyncThunk } from '@reduxjs/toolkit';");
    return this;
  }

  withReactReduxImports() {
    this.imports.add("import { useSelector, useDispatch } from 'react-redux';");
    return this;
  }

  withAllImports() {
    return this.withSliceImports()
      .withStoreImports()
      .withThunkImports()
      .withReactReduxImports();
  }

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

  withUseSelector(statePath, variableName = 'value') {
    this.code += `
const ${variableName} = useSelector(state => ${statePath});
`;
    this.selectors.push({ type: 'useSelector', path: statePath, line: this.estimateLineNumber() });
    return this;
  }

  withUseDispatch() {
    this.code += `
const dispatch = useDispatch();
`;
    return this;
  }

  withConnectHOC(mapStateFunc = 'mapStateToProps', mapDispatchFunc = null) {
    const secondArg = mapDispatchFunc ? `, ${mapDispatchFunc}` : '';
    this.code += `
export default connect(${mapStateFunc}${secondArg})(MyComponent);
`;
    return this;
  }

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

  withDispatchCall(action = 'increment()') {
    this.code += `
dispatch(${action});
`;
    return this;
  }

  withCompleteComponent() {
    return this.withAllImports()
      .withUseSelector('state.user.name', 'userName')
      .withUseSelector('state.user.email', 'userEmail')
      .withUseDispatch()
      .withDispatchCall('updateUser({ name: userName })');
  }

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
