/**
 * @fileoverview State Management Test Factory - Scenarios
 */

import { ContextBuilder, ReduxBuilder } from './builders.js';

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

