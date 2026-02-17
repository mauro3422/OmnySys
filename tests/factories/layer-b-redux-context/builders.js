/**
 * @fileoverview Layer B Redux Context Factory
 * 
 * Builders para testing de extracción de Redux y Context
 * 
 * @module tests/factories/layer-b-redux-context
 */

/**
 * Builder para código React con Redux
 */
export class ReduxCodeBuilder {
  constructor() {
    this.code = '';
    this.lineNumber = 1;
  }

  addLine(line) {
    this.code += line + '\n';
    this.lineNumber++;
    return this;
  }

  withUseSelector(selector) {
    return this.addLine(`const value = useSelector(${selector});`);
  }

  withUseDispatch() {
    return this.addLine('const dispatch = useDispatch();');
  }

  withCreateSlice(name) {
    return this.addLine(`const slice = createSlice({ name: '${name}', reducers: {} });`);
  }

  withConfigureStore() {
    return this.addLine('const store = configureStore({ reducer: {} });');
  }

  withCreateStore() {
    return this.addLine('const store = createStore(reducer);');
  }

  withCreateAsyncThunk(name) {
    return this.addLine(`const thunk = createAsyncThunk('${name}', async () => {});`);
  }

  withImports() {
    return this.addLine("import { useSelector, useDispatch, createSlice, configureStore, createAsyncThunk } from '@reduxjs/toolkit';");
  }

  withComplexSelector() {
    return this.addLine('const userName = useSelector((state) => state.user.profile.name);');
  }

  withMultipleSelectors() {
    this.withUseSelector('state => state.user');
    this.withUseSelector('state => state.settings');
    return this;
  }

  build() {
    return {
      code: this.code,
      lines: this.lineNumber - 1
    };
  }

  static create() {
    return new ReduxCodeBuilder();
  }
}

/**
 * Builder para código React con Context
 */
export class ContextCodeBuilder {
  constructor() {
    this.code = '';
    this.lineNumber = 1;
  }

  addLine(line) {
    this.code += line + '\n';
    this.lineNumber++;
    return this;
  }

  withCreateContext(name) {
    return this.addLine(`const ${name} = createContext();`);
  }

  withUseContext(name) {
    return this.addLine(`const value = useContext(${name});`);
  }

  withProvider(contextName) {
    return this.addLine(`<${contextName}.Provider value={value}>`);
  }

  withImports() {
    return this.addLine("import { createContext, useContext } from 'react';");
  }

  withMultipleContexts(names) {
    names.forEach(name => this.withCreateContext(name));
    return this;
  }

  build() {
    return {
      code: this.code,
      lines: this.lineNumber - 1
    };
  }

  static create() {
    return new ContextCodeBuilder();
  }
}

/**
 * Builder para código mixto (Redux + Context)
 */
export class MixedCodeBuilder {
  constructor() {
    this.reduxBuilder = new ReduxCodeBuilder();
    this.contextBuilder = new ContextCodeBuilder();
  }

  withRedux(code) {
    this.reduxBuilder.addLine(code);
    return this;
  }

  withContext(code) {
    this.contextBuilder.addLine(code);
    return this;
  }

  build() {
    const redux = this.reduxBuilder.build();
    const context = this.contextBuilder.build();
    return {
      code: redux.code + '\n' + context.code,
      reduxLines: redux.lines,
      contextLines: context.lines
    };
  }

  static create() {
    return new MixedCodeBuilder();
  }
}

/**
 * Exportación default
 */
export default {
  ReduxCodeBuilder,
  ContextCodeBuilder,
  MixedCodeBuilder
};
