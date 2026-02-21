/**
 * @fileoverview State Connection Builder
 * Builder for creating state connection test scenarios
 */

import { ReduxBuilder } from './redux-builder.js';
import { ContextBuilder } from './context-builder.js';

export class StateConnectionBuilder {
  constructor() {
    this.files = new Map();
  }

  static create() {
    return new StateConnectionBuilder();
  }

  withReduxFile(filePath, builderFn) {
    const builder = new ReduxBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  withContextFile(filePath, builderFn) {
    const builder = new ContextBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

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

  withSliceFile(filePath, sliceName) {
    const builder = new ReduxBuilder();
    builder.withSliceImports()
      .withSlice(sliceName, {
        actions: [`set${sliceName}`, `update${sliceName}`]
      });
    this.files.set(filePath, builder.build());
    return this;
  }

  withSelectorComponent(filePath, statePaths = ['state.user.name']) {
    const builder = new ReduxBuilder();
    builder.withReactReduxImports();
    
    statePaths.forEach((path, i) => {
      builder.withUseSelector(path, `value${i}`);
    });
    
    this.files.set(filePath, builder.build());
    return this;
  }

  withContextProviderFile(filePath, contextName = 'AppContext') {
    const builder = new ContextBuilder();
    builder.withReactImports()
      .withContext(contextName)
      .withProvider(contextName, `${contextName}Provider`);
    this.files.set(filePath, builder.build());
    return this;
  }

  withContextConsumerFile(filePath, contextName = 'AppContext') {
    const builder = new ContextBuilder();
    builder.withReactImports()
      .withUseContext(contextName, 'contextValue');
    this.files.set(filePath, builder.build());
    return this;
  }

  withReduxArchitecture() {
    return this
      .withSliceFile('features/counter/counterSlice.js', 'counter')
      .withSliceFile('features/user/userSlice.js', 'user')
      .withStoreFile('store.js', ['counter', 'user'])
      .withSelectorComponent('components/UserDisplay.js', ['state.user.name', 'state.user.email'])
      .withSelectorComponent('components/CounterDisplay.js', ['state.counter.value']);
  }

  withContextArchitecture() {
    return this
      .withContextProviderFile('contexts/AuthContext.js', 'AuthContext')
      .withContextConsumerFile('components/Login.js', 'AuthContext')
      .withContextConsumerFile('components/Profile.js', 'AuthContext');
  }

  withSharedSelectorScenario() {
    const sharedPath = 'state.user.id';
    
    this.withSelectorComponent('components/Header.js', [sharedPath]);
    this.withSelectorComponent('components/Profile.js', [sharedPath]);
    this.withSelectorComponent('components/Settings.js', [sharedPath, 'state.user.name']);
    
    return this;
  }

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
