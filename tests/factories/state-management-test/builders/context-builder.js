/**
 * @fileoverview Context Builder
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

  static create() {
    return new ContextBuilder();
  }

  withReactImports() {
    this.imports.add("import React, { createContext, useContext } from 'react';");
    return this;
  }

  withReact18Imports() {
    this.imports.add("import { use } from 'react';");
    return this;
  }

  withContext(name = 'MyContext', defaultValue = 'null') {
    this.code += `
const ${name} = createContext(${defaultValue});
export default ${name};
`;
    this.contexts.push({ name, line: this.estimateLineNumber() });
    return this;
  }

  withTypedContext(name = 'TypedContext', type = 'string') {
    this.code += `
const ${name} = createContext<${type} | null>(null);
`;
    this.contexts.push({ name, typed: true, line: this.estimateLineNumber() });
    return this;
  }

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

  withUseContext(contextName = 'MyContext', variableName = 'contextValue') {
    this.code += `
const ${variableName} = useContext(${contextName});
`;
    this.consumers.push({ type: 'useContext', contextName, variableName, line: this.estimateLineNumber() });
    return this;
  }

  withUseHook(contextName = 'MyContext', variableName = 'contextValue') {
    this.code += `
const ${variableName} = use(${contextName});
`;
    this.consumers.push({ type: 'use', contextName, variableName, line: this.estimateLineNumber() });
    return this;
  }

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

  withCompleteContext(contextName = 'AppContext') {
    return this.withReactImports()
      .withContext(contextName)
      .withProvider(contextName, `${contextName}Provider`)
      .withUseContext(contextName, 'contextValue');
  }

  withThemeContext() {
    return this.withReactImports()
      .withContext('ThemeContext', "'light'")
      .withProvider('ThemeContext', 'ThemeProvider')
      .withUseContext('ThemeContext', 'theme');
  }

  withAuthContext() {
    return this.withReactImports()
      .withContext('AuthContext', 'null')
      .withProvider('AuthContext', 'AuthProvider')
      .withUseContext('AuthContext', 'auth');
  }

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
