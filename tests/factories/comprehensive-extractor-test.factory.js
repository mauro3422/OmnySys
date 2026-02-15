/**
 * @fileoverview Comprehensive Extractor Test Factory
 * 
 * Factory for creating test data and mock objects for comprehensive extractor testing.
 * Provides builders for extraction configurations, class extraction, function extraction,
 * import/export scenarios, and AST structures.
 * 
 * @module tests/factories/comprehensive-extractor-test
 */

// ============================================
// CONFIGURATION BUILDERS
// ============================================

/**
 * Builder for extraction configurations
 */
export class ExtractionConfigBuilder {
  constructor() {
    this.config = {
      extractors: {
        functions: true,
        classes: true,
        imports: true,
        exports: true
      },
      detailLevel: 'standard',
      includeSource: false,
      calculateMetrics: true,
      detectPatterns: true,
      timeout: 30000
    };
  }

  withFunctions(enabled = true) {
    this.config.extractors.functions = enabled;
    return this;
  }

  withClasses(enabled = true) {
    this.config.extractors.classes = enabled;
    return this;
  }

  withImports(enabled = true) {
    this.config.extractors.imports = enabled;
    return this;
  }

  withExports(enabled = true) {
    this.config.extractors.exports = enabled;
    return this;
  }

  withDetailLevel(level) {
    this.config.detailLevel = level;
    return this;
  }

  withMetrics(enabled = true) {
    this.config.calculateMetrics = enabled;
    return this;
  }

  withPatternDetection(enabled = true) {
    this.config.detectPatterns = enabled;
    return this;
  }

  withTimeout(timeout) {
    this.config.timeout = timeout;
    return this;
  }

  withSource(enabled = true) {
    this.config.includeSource = enabled;
    return this;
  }

  build() {
    return { ...this.config };
  }

  static minimal() {
    return new ExtractionConfigBuilder()
      .withDetailLevel('minimal')
      .withMetrics(false)
      .withPatternDetection(false)
      .build();
  }

  static standard() {
    return new ExtractionConfigBuilder().build();
  }

  static detailed() {
    return new ExtractionConfigBuilder()
      .withDetailLevel('detailed')
      .withSource(true)
      .build();
  }

  static functionsOnly() {
    return new ExtractionConfigBuilder()
      .withClasses(false)
      .withImports(false)
      .withExports(false)
      .build();
  }

  static classesOnly() {
    return new ExtractionConfigBuilder()
      .withFunctions(false)
      .withImports(false)
      .withExports(false)
      .build();
  }
}

// ============================================
// CLASS EXTRACTION BUILDERS
// ============================================

/**
 * Builder for class extraction test scenarios
 */
export class ClassExtractionBuilder {
  constructor() {
    this.code = '';
    this.classes = [];
  }

  withClass(name, options = {}) {
    const {
      extends: superClass = null,
      implements: interfaces = [],
      abstract = false,
      exported = false,
      methods = [],
      properties = [],
      decorators = []
    } = options;

    const classDef = {
      name,
      superClass,
      interfaces,
      abstract,
      exported,
      methods,
      properties,
      decorators
    };

    this.classes.push(classDef);
    
    // Generate code
    const exportStr = exported ? 'export ' : '';
    const abstractStr = abstract ? 'abstract ' : '';
    const extendsStr = superClass ? ` extends ${superClass}` : '';
    const implementsStr = interfaces.length > 0 
      ? ` implements ${interfaces.join(', ')}` 
      : '';

    let code = '';
    
    // Add decorators
    decorators.forEach(d => {
      code += `@${d}${d.includes('(') ? '' : '()'}\n`;
    });

    code += `${exportStr}${abstractStr}class ${name}${extendsStr}${implementsStr} {\n`;
    
    // Add properties
    properties.forEach(prop => {
      const staticStr = prop.static ? 'static ' : '';
      const readonlyStr = prop.readonly ? 'readonly ' : '';
      const privateStr = prop.private ? '#' : '';
      const typeStr = prop.type ? `: ${prop.type}` : '';
      code += `  ${staticStr}${readonlyStr}${privateStr}${prop.name}${typeStr};\n`;
    });

    if (properties.length > 0) code += '\n';

    // Add constructor
    if (!methods.find(m => m.name === 'constructor')) {
      code += `  constructor() {}\n\n`;
    }

    // Add methods
    methods.forEach(method => {
      const staticStr = method.static ? 'static ' : '';
      const asyncStr = method.async ? 'async ' : '';
      const privateStr = method.private ? '#' : '';
      const abstractStr = method.abstract ? 'abstract ' : '';
      const overrideStr = method.override ? 'override ' : '';
      const params = method.params?.join(', ') || '';
      const returnType = method.returnType ? `: ${method.returnType}` : '';
      
      if (method.kind === 'get' || method.kind === 'set') {
        code += `  ${staticStr}${abstractStr}${overrideStr}${method.kind} ${method.name}(${params})${returnType} {\n    ${method.body || 'return this._value;'}\n  }\n\n`;
      } else if (method.name === 'constructor') {
        code += `  ${method.name}(${params}) {\n    ${method.body || ''}\n  }\n\n`;
      } else {
        code += `  ${staticStr}${asyncStr}${abstractStr}${overrideStr}${privateStr}${method.name}(${params})${returnType} {\n    ${method.body || 'return null;'}\n  }\n\n`;
      }
    });

    code += `}\n\n`;
    this.code += code;
    
    return this;
  }

  withInheritanceChain(chain) {
    // chain: ['Base', 'Middle', 'Derived']
    for (let i = 0; i < chain.length; i++) {
      const name = chain[i];
      const superClass = i > 0 ? chain[i - 1] : null;
      this.withClass(name, { extends: superClass });
    }
    return this;
  }

  withMixin(className, mixinName, baseClass) {
    this.code += `class ${className} extends ${mixinName}(${baseClass}) {}\n\n`;
    return this;
  }

  withInterface(name, methods = []) {
    let code = `interface ${name} {\n`;
    methods.forEach(m => {
      const params = m.params?.join(', ') || '';
      const returnType = m.returnType || 'void';
      code += `  ${m.name}(${params}): ${returnType};\n`;
    });
    code += `}\n\n`;
    this.code += code;
    return this;
  }

  build() {
    return {
      code: this.code,
      classes: this.classes
    };
  }

  static simpleClass(name = 'SimpleClass') {
    return new ClassExtractionBuilder()
      .withClass(name, {
        methods: [{ name: 'method1', params: [] }]
      })
      .build();
  }

  static classWithInheritance(name = 'ChildClass') {
    return new ClassExtractionBuilder()
      .withClass('ParentClass', { methods: [{ name: 'parentMethod', params: [] }] })
      .withClass(name, { 
        extends: 'ParentClass',
        methods: [{ name: 'childMethod', params: [] }]
      })
      .build();
  }

  static abstractClass(name = 'AbstractBase') {
    return new ClassExtractionBuilder()
      .withClass(name, {
        abstract: true,
        methods: [
          { name: 'abstractMethod', params: [], abstract: true },
          { name: 'concreteMethod', params: [], body: 'return 1;' }
        ]
      })
      .build();
  }

  static classWithAllFeatures(name = 'FullClass') {
    return new ClassExtractionBuilder()
      .withClass(name, {
        exported: true,
        implements: ['Interface1', 'Interface2'],
        decorators: ['Component', 'Injectable'],
        properties: [
          { name: 'publicProp', type: 'string' },
          { name: 'privateProp', private: true, type: 'number' },
          { name: 'staticProp', static: true, type: 'boolean' }
        ],
        methods: [
          { name: 'constructor', params: ['props'] },
          { name: 'publicMethod', params: ['a', 'b'], body: 'return a + b;' },
          { name: 'privateMethod', private: true, params: [], body: 'return;' },
          { name: 'staticMethod', static: true, params: [], body: 'return "static";' },
          { name: 'asyncMethod', async: true, params: ['url'], body: 'return fetch(url);' },
          { name: 'getter', kind: 'get', params: [], body: 'return this._value;' },
          { name: 'setter', kind: 'set', params: ['value'], body: 'this._value = value;' }
        ]
      })
      .build();
  }
}

// ============================================
// FUNCTION EXTRACTION BUILDERS
// ============================================

/**
 * Builder for function extraction test scenarios
 */
export class FunctionExtractionBuilder {
  constructor() {
    this.code = '';
    this.functions = [];
  }

  withFunction(name, params = [], options = {}) {
    const {
      body = 'return null;',
      async = false,
      generator = false,
      exported = false,
      returnType = null
    } = options;

    const funcDef = {
      name,
      params,
      async,
      generator,
      exported,
      returnType
    };

    this.functions.push(funcDef);

    const exportStr = exported ? 'export ' : '';
    const asyncStr = async ? 'async ' : '';
    const genStr = generator ? '* ' : '';
    const paramStr = params.join(', ');
    const returnTypeStr = returnType ? `: ${returnType}` : '';

    this.code += `${exportStr}${asyncStr}function${genStr} ${name}(${paramStr})${returnTypeStr} {\n  ${body}\n}\n\n`;

    return this;
  }

  withArrowFunction(name, params = [], options = {}) {
    const {
      body = 'null',
      async = false,
      exported = false,
      block = true
    } = options;

    const exportStr = exported ? 'export ' : '';
    const asyncStr = async ? 'async ' : '';
    const paramStr = params.join(', ');
    
    if (block) {
      this.code += `${exportStr}const ${name} = ${asyncStr}(${paramStr}) => {\n  return ${body};\n};\n\n`;
    } else {
      this.code += `${exportStr}const ${name} = ${asyncStr}(${paramStr}) => ${body};\n\n`;
    }

    return this;
  }

  withFunctionExpression(name, params = [], options = {}) {
    const {
      body = 'return null;',
      async = false,
      exported = false
    } = options;

    const exportStr = exported ? 'export ' : '';
    const asyncStr = async ? 'async ' : '';
    const paramStr = params.join(', ');

    this.code += `${exportStr}const ${name} = ${asyncStr}function(${paramStr}) {\n  ${body}\n};\n\n`;

    return this;
  }

  withHigherOrderFunction(name, options = {}) {
    const { exported = false } = options;
    const exportStr = exported ? 'export ' : '';

    this.code += `${exportStr}function ${name}(fn) {\n  return function(x) {\n    return fn(x);\n  };\n}\n\n`;

    return this;
  }

  withRecursiveFunction(name, param, options = {}) {
    const { exported = false } = options;
    const exportStr = exported ? 'export ' : '';

    this.code += `${exportStr}function ${name}(${param}) {\n  if (${param} <= 1) return 1;\n  return ${param} * ${name}(${param} - 1);\n}\n\n`;

    return this;
  }

  withComplexFunction(name, options = {}) {
    const {
      params = ['a', 'b', 'c'],
      complexity = 'medium',
      exported = false
    } = options;

    let body;
    switch (complexity) {
      case 'low':
        body = 'return a;';
        break;
      case 'medium':
        body = `if (a > 0) {\n    return b + c;\n  }\n  for (let i = 0; i < 10; i++) {\n    console.log(i);\n  }\n  return a;`;
        break;
      case 'high':
        body = `if (a > 0) {\n    if (b > 0) {\n      return c;\n    } else if (b < 0) {\n      return -c;\n    }\n  }\n  switch (c) {\n    case 1: return a;\n    case 2: return b;\n    default: return 0;\n  }`;
        break;
      default:
        body = 'return null;';
    }

    return this.withFunction(name, params, { body, exported });
  }

  build() {
    return {
      code: this.code,
      functions: this.functions
    };
  }

  static simpleFunction(name = 'simpleFn') {
    return new FunctionExtractionBuilder()
      .withFunction(name, ['x', 'y'], { body: 'return x + y;' })
      .build();
  }

  static asyncFunction(name = 'asyncFn') {
    return new FunctionExtractionBuilder()
      .withFunction(name, ['url'], { async: true, body: 'return fetch(url);' })
      .build();
  }

  static generatorFunction(name = 'genFn') {
    return new FunctionExtractionBuilder()
      .withFunction(name, [], { generator: true, body: 'yield 1; yield 2; yield 3;' })
      .build();
  }

  static allFunctionTypes() {
    return new FunctionExtractionBuilder()
      .withFunction('regularFn', ['a'], { body: 'return a;' })
      .withArrowFunction('arrowFn', ['b'], { body: 'b * 2' })
      .withFunctionExpression('exprFn', ['c'], { body: 'return c;' })
      .withFunction('asyncFn', ['url'], { async: true, body: 'return fetch(url);' })
      .withFunction('genFn', [], { generator: true, body: 'yield 1;' })
      .build();
  }
}

// ============================================
// IMPORT/EXPORT BUILDERS
// ============================================

/**
 * Builder for import/export test scenarios
 */
export class ImportExportBuilder {
  constructor() {
    this.code = '';
    this.imports = [];
    this.exports = [];
  }

  // === IMPORTS ===

  withNamedImport(names, source) {
    this.imports.push({ type: 'NamedImport', names, source });
    this.code += `import { ${names.join(', ')} } from '${source}';\n`;
    return this;
  }

  withDefaultImport(name, source) {
    this.imports.push({ type: 'DefaultImport', name, source });
    this.code += `import ${name} from '${source}';\n`;
    return this;
  }

  withNamespaceImport(name, source) {
    this.imports.push({ type: 'NamespaceImport', name, source });
    this.code += `import * as ${name} from '${source}';\n`;
    return this;
  }

  withSideEffectImport(source) {
    this.imports.push({ type: 'SideEffectImport', source });
    this.code += `import '${source}';\n`;
    return this;
  }

  withCommonJSRequire(names, source) {
    this.imports.push({ type: 'CommonJSRequire', names, source });
    const nameStr = Array.isArray(names) 
      ? `{ ${names.join(', ')} }` 
      : names;
    this.code += `const ${nameStr} = require('${source}');\n`;
    return this;
  }

  withDynamicImport(source, options = {}) {
    const { lazy = false, conditional = false, hasAwait = true } = options;
    
    if (conditional) {
      this.code += `if (condition) {\n  ${hasAwait ? 'await ' : ''}import('${source}');\n}\n`;
    } else if (lazy) {
      this.code += `const lazyModule = ${hasAwait ? 'await ' : ''}import('${source}');\n`;
    } else {
      this.code += `${hasAwait ? 'await ' : ''}import('${source}');\n`;
    }
    
    return this;
  }

  // === EXPORTS ===

  withNamedExport(name, value = null) {
    this.exports.push({ type: 'NamedExport', name });
    if (value !== null) {
      this.code += `export const ${name} = ${value};\n`;
    } else {
      this.code += `export { ${name} };\n`;
    }
    return this;
  }

  withDefaultExport(name) {
    this.exports.push({ type: 'DefaultExport', name });
    this.code += `export default ${name};\n`;
    return this;
  }

  withDefaultExportFunction(name, params = []) {
    this.exports.push({ type: 'DefaultExport', name });
    this.code += `export default function ${name}(${params.join(', ')}) {\n  return null;\n}\n`;
    return this;
  }

  withDefaultExportClass(name) {
    this.exports.push({ type: 'DefaultExport', name });
    this.code += `export default class ${name} {}\n`;
    return this;
  }

  withReExport(names, source) {
    this.exports.push({ type: 'ReExport', names, source });
    this.code += `export { ${names.join(', ')} } from '${source}';\n`;
    return this;
  }

  withExportAll(source) {
    this.exports.push({ type: 'ExportAll', source });
    this.code += `export * from '${source}';\n`;
    return this;
  }

  withCommonJSExport(names) {
    if (Array.isArray(names)) {
      this.exports.push({ type: 'CommonJSExport', names });
      this.code += `module.exports = { ${names.join(', ')} };\n`;
    } else {
      this.exports.push({ type: 'CommonJSExport', names: [names] });
      this.code += `module.exports = ${names};\n`;
    }
    return this;
  }

  withExportsProperty(name) {
    this.exports.push({ type: 'CommonJSExport', names: [name] });
    this.code += `exports.${name} = ${name};\n`;
    return this;
  }

  // === BARREL PATTERN ===

  asBarrelFile(sources) {
    this.code = '';
    sources.forEach(source => {
      this.code += `export * from '${source}';\n`;
    });
    return this;
  }

  build() {
    return {
      code: this.code,
      imports: this.imports,
      exports: this.exports
    };
  }

  static es6Imports() {
    return new ImportExportBuilder()
      .withNamedImport(['foo', 'bar'], './module')
      .withDefaultImport('DefaultExport', './default')
      .withNamespaceImport('Namespace', './namespace')
      .withSideEffectImport('./polyfill')
      .build();
  }

  static commonJSImports() {
    return new ImportExportBuilder()
      .withCommonJSRequire(['foo', 'bar'], './module')
      .withCommonJSRequire('defaultExport', './default')
      .build();
  }

  static mixedImports() {
    return new ImportExportBuilder()
      .withNamedImport(['es6Named'], './es6')
      .withCommonJSRequire(['cjsNamed'], './cjs')
      .withDynamicImport('./dynamic')
      .build();
  }

  static es6Exports() {
    return new ImportExportBuilder()
      .withNamedExport('foo', '1')
      .withNamedExport('bar', '2')
      .withDefaultExport('defaultFn')
      .build();
  }

  static commonJSExports() {
    return new ImportExportBuilder()
      .withCommonJSExport(['foo', 'bar'])
      .withExportsProperty('baz')
      .build();
  }

  static barrelFile() {
    return new ImportExportBuilder()
      .withExportAll('./module1')
      .withExportAll('./module2')
      .withReExport(['named1', 'named2'], './module3')
      .build();
  }
}

// ============================================
// AST BUILDERS
// ============================================

/**
 * Builder for AST structures and mock nodes
 */
export class ASTBuilder {
  constructor() {
    this.nodes = [];
  }

  withFunctionDeclaration(name, params = [], options = {}) {
    const { async = false, generator = false } = options;
    
    this.nodes.push({
      type: 'FunctionDeclaration',
      id: { name },
      async,
      generator,
      params: params.map(p => ({ name: p })),
      start: 0,
      end: 100
    });
    
    return this;
  }

  withArrowFunction(name, params = [], options = {}) {
    const { async = false } = options;
    
    this.nodes.push({
      type: 'ArrowFunctionExpression',
      id: { name },
      async,
      params: params.map(p => ({ name: p })),
      start: 0,
      end: 100
    });
    
    return this;
  }

  withClassDeclaration(name, options = {}) {
    const { superClass = null } = options;
    
    this.nodes.push({
      type: 'ClassDeclaration',
      id: { name },
      superClass: superClass ? { name: superClass } : null,
      start: 0,
      end: 100
    });
    
    return this;
  }

  withImportDeclaration(names, source, importType = 'named') {
    this.nodes.push({
      type: 'ImportDeclaration',
      source: { value: source },
      specifiers: names.map(name => ({
        type: importType === 'default' ? 'ImportDefaultSpecifier' : 'ImportSpecifier',
        local: { name }
      })),
      start: 0,
      end: 100
    });
    
    return this;
  }

  withExportDeclaration(name, exportType = 'named') {
    this.nodes.push({
      type: 'ExportNamedDeclaration',
      declaration: {
        type: 'VariableDeclaration',
        declarations: [{
          id: { name }
        }]
      },
      exportKind: exportType,
      start: 0,
      end: 100
    });
    
    return this;
  }

  build() {
    return {
      type: 'File',
      program: {
        type: 'Program',
        body: this.nodes,
        sourceType: 'module'
      }
    };
  }

  buildNode(type) {
    return this.nodes.find(n => n.type === type) || null;
  }
}

// ============================================
// SCENARIO FACTORIES
// ============================================

/**
 * Factory for common extraction scenarios
 */
export class ExtractionScenarioFactory {
  static emptyFile() {
    return {
      code: '',
      filePath: 'test/empty.js'
    };
  }

  static simpleModule() {
    return {
      code: `
import { helper } from './helper';

export function greet(name) {
  return helper(name);
}

export default greet;
      `.trim(),
      filePath: 'test/module.js'
    };
  }

  static complexModule() {
    return {
      code: `
import React, { useState, useEffect } from 'react';
import * as utils from './utils';
import './styles.css';

const { helper } = require('./common');

export class Component extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  async handleClick() {
    const data = await fetch('/api/data');
    this.setState({ data });
  }

  render() {
    return <div>{this.state.count}</div>;
  }
}

export const useCounter = (initial = 0) => {
  const [count, setCount] = useState(initial);
  return { count, setCount };
};

export function* generator() {
  yield 1;
  yield 2;
  yield 3;
}

export { helper } from './common';
export * from './types';

export default Component;
      `.trim(),
      filePath: 'test/complex.tsx'
    };
  }

  static testFile() {
    return {
      code: `
import { describe, it, expect } from 'vitest';
import { myFunction } from './module';

describe('myFunction', () => {
  it('should work', () => {
    expect(myFunction()).toBe(true);
  });
});
      `.trim(),
      filePath: 'test/module.test.js'
    };
  }

  static configFile() {
    return {
      code: `
export default {
  port: 3000,
  host: 'localhost'
};
      `.trim(),
      filePath: 'test/app.config.js'
    };
  }

  static barrelFile() {
    return {
      code: `
export * from './components';
export * from './utils';
export * from './hooks';
      `.trim(),
      filePath: 'test/index.js'
    };
  }

  static singletonPattern() {
    return {
      code: `
export class Singleton {
  static instance;

  static getInstance() {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }

  constructor() {
    if (Singleton.instance) {
      throw new Error('Use getInstance()');
    }
  }
}
      `.trim(),
      filePath: 'test/singleton.js'
    };
  }

  static factoryPattern() {
    return {
      code: `
export function createUser(data) {
  return {
    id: data.id,
    name: data.name
  };
}

export class UserFactory {
  create(data) {
    return createUser(data);
  }
}
      `.trim(),
      filePath: 'test/factory.js'
    };
  }

  static asyncPatterns() {
    return {
      code: `
export async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}

export function fetchWithPromise() {
  return fetch('/api/data')
    .then(r => r.json())
    .then(data => data.items);
}

export async function parallelFetch() {
  const [a, b] = await Promise.all([
    fetch('/a'),
    fetch('/b')
  ]);
  return { a, b };
}
      `.trim(),
      filePath: 'test/async.js'
    };
  }
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validation utilities for extraction results
 */
export class ExtractionValidator {
  static isValidExtractionResult(result) {
    return result !== null && 
           result !== undefined && 
           typeof result === 'object' &&
           !result.error;
  }

  static hasFunctions(result) {
    return result.functions && 
           Array.isArray(result.functions.functions);
  }

  static hasClasses(result) {
    return result.classes && 
           Array.isArray(result.classes.classes);
  }

  static hasImports(result) {
    return result.imports && 
           Array.isArray(result.imports.all);
  }

  static hasExports(result) {
    return result.exports && 
           Array.isArray(result.exports.all);
  }

  static hasMetadata(result) {
    return result.basic && 
           typeof result.basic === 'object';
  }

  static hasMetrics(result) {
    return result.metrics && 
           typeof result.metrics === 'object';
  }

  static hasPatterns(result) {
    return result.patterns && 
           typeof result.patterns === 'object';
  }

  static validateCompleteness(result, minCompleteness = 0) {
    return result._meta && 
           typeof result._meta.completeness === 'number' &&
           result._meta.completeness >= minCompleteness;
  }

  static validateFunction(func) {
    return func &&
           typeof func.name === 'string' &&
           typeof func.start === 'number';
  }

  static validateClass(cls) {
    return cls &&
           typeof cls.name === 'string' &&
           typeof cls.start === 'number';
  }

  static validateImport(imp) {
    return imp &&
           typeof imp.source === 'string' &&
           typeof imp.type === 'string';
  }

  static validateExport(exp) {
    return exp &&
           (typeof exp.name === 'string' || Array.isArray(exp.names));
  }
}

// ============================================
// TEST CONSTANTS
// ============================================

export const TestConstants = {
  VALID_JS_FILE: 'test/file.js',
  VALID_TS_FILE: 'test/file.ts',
  VALID_TSX_FILE: 'test/file.tsx',
  VALID_JSX_FILE: 'test/file.jsx',
  
  DETAIL_LEVELS: {
    MINIMAL: 'minimal',
    STANDARD: 'standard',
    DETAILED: 'detailed'
  },

  EXTRACTOR_TYPES: {
    FUNCTIONS: 'functions',
    CLASSES: 'classes',
    IMPORTS: 'imports',
    EXPORTS: 'exports'
  },

  IMPORT_TYPES: {
    NAMED: 'NamedImport',
    DEFAULT: 'DefaultImport',
    NAMESPACE: 'NamespaceImport',
    SIDE_EFFECT: 'SideEffectImport',
    COMMONJS: 'CommonJSRequire'
  },

  EXPORT_TYPES: {
    NAMED: 'NamedExport',
    DEFAULT: 'DefaultExport',
    RE_EXPORT: 'ReExport',
    EXPORT_ALL: 'ExportAll',
    COMMONJS: 'CommonJSExport'
  },

  PATTERNS: {
    SINGLETON: 'singleton',
    FACTORY: 'factory',
    BARREL: 'barrel',
    REACT: 'react'
  }
};

// ============================================
// MOCK UTILITIES
// ============================================

/**
 * Create mock extraction results for testing
 */
export function createMockExtractionResult(options = {}) {
  const {
    hasFunctions = true,
    hasClasses = true,
    hasImports = true,
    hasExports = true,
    hasMetrics = true,
    hasPatterns = true,
    completeness = 100
  } = options;

  const result = {
    basic: {
      filePath: 'test/mock.js',
      size: 1000,
      lineCount: 50,
      hasImports: hasImports,
      hasExports: hasExports,
      isTestFile: false,
      isConfigFile: false,
      isTypeScript: false,
      isJSX: false
    },
    _meta: {
      extractorCount: 0,
      extractionTime: 10,
      completeness,
      timestamp: new Date().toISOString(),
      version: '3.0.0-test'
    },
    needsLLM: completeness < 50
  };

  if (hasFunctions) {
    result.functions = {
      functions: [],
      arrowFunctions: [],
      totalCount: 0,
      asyncCount: 0,
      _metadata: { success: true }
    };
    result.asyncPatterns = {
      hasAsyncAwait: false,
      hasPromises: false,
      asyncFunctionCount: 0,
      awaitCount: 0
    };
    result._meta.extractorCount++;
  }

  if (hasClasses) {
    result.classes = {
      classes: [],
      count: 0,
      inheritanceDepth: 0,
      _metadata: { success: true }
    };
    result._meta.extractorCount++;
  }

  if (hasImports) {
    result.imports = {
      all: [],
      named: [],
      defaultImports: [],
      namespace: [],
      sideEffect: [],
      commonjs: [],
      dynamicImports: [],
      metrics: {},
      _metadata: { success: true }
    };
    result._meta.extractorCount++;
  }

  if (hasExports) {
    result.exports = {
      all: [],
      named: [],
      defaultExport: null,
      reExports: [],
      exportAll: [],
      assignments: [],
      patterns: {},
      metrics: {},
      _metadata: { success: true }
    };
    result._meta.extractorCount++;
  }

  if (hasMetrics) {
    result.metrics = {
      totalConstructs: 0,
      complexity: { cyclomatic: 0, cognitive: 0 },
      maintainability: { score: 100, factors: [] }
    };
  }

  if (hasPatterns) {
    result.patterns = {
      architectural: [],
      structural: [],
      behavioral: []
    };
  }

  return result;
}

export default {
  ExtractionConfigBuilder,
  ClassExtractionBuilder,
  FunctionExtractionBuilder,
  ImportExportBuilder,
  ASTBuilder,
  ExtractionScenarioFactory,
  ExtractionValidator,
  TestConstants,
  createMockExtractionResult
};
