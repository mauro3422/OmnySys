// Parser Test Factory
// Factory for creating test data and mock objects for parser testing.

import { parse } from '@babel/parser';

// Builder for creating code samples to test parsers
export class CodeSampleBuilder {
  constructor() {
    this.code = '';
    this.filePath = 'test.js';
  }

  withFunction(name, params = [], body = 'return null;', options = {}) {
    const async = options.async ? 'async ' : '';
    const generator = options.generator ? '* ' : '';
    const exported = options.exported ? 'export ' : '';
    const paramStr = params.join(', ');
    const funcCode = exported + async + 'function' + generator + ' ' + name + '(' + paramStr + ') {\n  ' + body + '\n}\n\n';
    this.code += funcCode;
    return this;
  }

  withArrow(name, params = [], body = 'null', options = {}) {
    const exported = options.exported ? 'export ' : '';
    const paramStr = params.join(', ');
    const blockBody = options.block ? '{\n  return ' + body + ';\n}' : body;
    const arrowCode = exported + 'const ' + name + ' = (' + paramStr + ') => ' + blockBody + ';\n\n';
    this.code += arrowCode;
    return this;
  }

  withFunctionExpression(name, params = [], body = 'return null;', options = {}) {
    const exported = options.exported ? 'export ' : '';
    const async = options.async ? 'async ' : '';
    const paramStr = params.join(', ');
    const exprCode = exported + 'const ' + name + ' = ' + async + 'function(' + paramStr + ') {\n  ' + body + '\n};\n\n';
    this.code += exprCode;
    return this;
  }

  withClass(name, methods = [], options = {}) {
    const exported = options.exported ? 'export ' : '';
    const extendsClause = options.extends ? ' extends ' + options.extends : '';
    let classCode = exported + 'class ' + name + extendsClause + ' {\n';
    for (const method of methods) {
      const staticKeyword = method.static ? 'static ' : '';
      const async = method.async ? 'async ' : '';
      const params = method.params?.join(', ') || '';
      const methodBody = method.body || '';
      classCode += '  ' + staticKeyword + async + method.name + '(' + params + ') {\n    ' + methodBody + '\n  }\n\n';
    }
    classCode += '}\n\n';
    this.code += classCode;
    return this;
  }

  withImport(source, specifiers = [], options = {}) {
    let importCode = '';
    if (options.default && specifiers.length > 0) {
      importCode = "import " + specifiers[0] + " from '" + source + "';\n";
    } else if (options.namespace && specifiers.length > 0) {
      importCode = "import * as " + specifiers[0] + " from '" + source + "';\n";
    } else if (specifiers.length > 0) {
      const specStr = specifiers.join(', ');
      importCode = "import { " + specStr + " } from '" + source + "';\n";
    } else {
      importCode = "import '" + source + "';\n";
    }
    this.code += importCode + '\n';
    return this;
  }

  withExport(name, options = {}) {
    if (options.default) {
      this.code += 'export default ' + name + ';\n\n';
    } else if (options.kind) {
      this.code += 'export ' + options.kind + ' ' + name + ' = ...;\n\n';
    } else {
      this.code += 'export { ' + name + ' };\n\n';
    }
    return this;
  }

  withExportDeclaration(kind, name, value) {
    if (kind === 'function') {
      this.code += 'export function ' + name + '() {\n  ' + (value || 'return null;') + '\n}\n\n';
    } else if (kind === 'class') {
      this.code += 'export class ' + name + ' {\n  ' + (value || '') + '\n}\n\n';
    } else {
      this.code += 'export ' + kind + ' ' + name + ' = ' + (value || 'null') + ';\n\n';
    }
    return this;
  }

  withRequire(variable, source) {
    if (variable) {
      this.code += "const " + variable + " = require('" + source + "');\n\n";
    } else {
      this.code += "require('" + source + "');\n\n";
    }
    return this;
  }

  withDynamicImport(source, variable = null) {
    if (variable) {
      this.code += 'const ' + variable + ' = await import(\'' + source + '\');\n\n';
    } else {
      this.code += 'import(\'' + source + '\');\n\n';
    }
    return this;
  }

  withCall(name, args = []) {
    const argStr = args.join(', ');
    this.code += name + '(' + argStr + ');\n\n';
    return this;
  }

  withMemberCall(object, method, args = []) {
    const argStr = args.join(', ');
    this.code += object + '.' + method + '(' + argStr + ');\n\n';
    return this;
  }

  withTSInterface(name, properties = {}, options = {}) {
    const exported = options.exported ? 'export ' : '';
    let interfaceCode = exported + 'interface ' + name + ' {\n';
    for (const [propName, propType] of Object.entries(properties)) {
      interfaceCode += '  ' + propName + ': ' + propType + ';\n';
    }
    interfaceCode += '}\n\n';
    this.code += interfaceCode;
    return this;
  }

  withTSTypeAlias(name, definition, options = {}) {
    const exported = options.exported ? 'export ' : '';
    this.code += exported + 'type ' + name + ' = ' + definition + ';\n\n';
    return this;
  }

  withTSEnum(name, members = {}, options = {}) {
    const exported = options.exported ? 'export ' : '';
    let enumCode = exported + 'enum ' + name + ' {\n';
    for (const [memberName, memberValue] of Object.entries(members)) {
      enumCode += '  ' + memberName + (memberValue !== undefined ? ' = ' + memberValue : '') + ',\n';
    }
    enumCode += '}\n\n';
    this.code += enumCode;
    return this;
  }

  withVariable(kind, name, value, options = {}) {
    const exported = options.exported ? 'export ' : '';
    this.code += exported + kind + ' ' + name + ' = ' + value + ';\n\n';
    return this;
  }

  withObject(name, properties = {}, options = {}) {
    const exported = options.exported ? 'export ' : '';
    const props = Object.entries(properties).map(([key, val]) => {
      if (typeof val === 'function') {
        return '  ' + key + val();
      } else if (typeof val === 'object' && val !== null) {
        return '  ' + key + ': ' + JSON.stringify(val);
      } else {
        return '  ' + key + ': ' + val;
      }
    }).join(',\n');
    this.code += exported + 'const ' + name + ' = {\n' + props + '\n};\n\n';
    return this;
  }

  atFilePath(filePath) {
    this.filePath = filePath;
    return this;
  }

  withRaw(code) {
    this.code += code + '\n';
    return this;
  }

  build() {
    return {
      code: this.code,
      filePath: this.filePath
    };
  }
}

// Builder for creating AST structures
export class ASTBuilder {
  constructor() {
    this.nodes = [];
  }

  static parse(code, options = {}) {
    const defaultOptions = {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      plugins: ['jsx', 'objectRestSpread', 'decorators', 'classProperties', 'typescript']
    };
    return parse(code, { ...defaultOptions, ...options });
  }

  static createMockNodePath(node, parent = null) {
    return {
      node,
      parent,
      parentPath: parent ? { node: parent, type: parent.type } : null,
      isReferencedIdentifier: () => true,
      traverse: () => {}
    };
  }

  static buildFileInfo(overrides = {}) {
    return {
      filePath: '/test/file.js',
      fileName: 'file.js',
      ext: '.js',
      imports: [],
      exports: [],
      definitions: [],
      calls: [],
      functions: [],
      identifierRefs: [],
      typeDefinitions: [],
      enumDefinitions: [],
      constantExports: [],
      objectExports: [],
      typeUsages: [],
      ...overrides
    };
  }
}

// Builder for creating import statements
export class ImportBuilder {
  constructor() {
    this.imports = [];
  }

  withNamed(source, imported, local = null) {
    this.imports.push({
      type: 'named',
      source,
      imported,
      local: local || imported
    });
    return this;
  }

  withDefault(source, local) {
    this.imports.push({
      type: 'default',
      source,
      local
    });
    return this;
  }

  withNamespace(source, local) {
    this.imports.push({
      type: 'namespace',
      source,
      local
    });
    return this;
  }

  withCommonJS(source) {
    this.imports.push({
      type: 'commonjs',
      source
    });
    return this;
  }

  withDynamic(source) {
    this.imports.push({
      type: 'dynamic',
      source
    });
    return this;
  }

  build() {
    return this.imports;
  }
}

// Builder for creating export statements
export class ExportBuilder {
  constructor() {
    this.exports = [];
  }

  withNamed(name, local = null, source = null) {
    this.exports.push({
      type: source ? 'reexport' : 'named',
      name,
      local: local || name,
      ...(source && { source })
    });
    return this;
  }

  withDefault(kind = 'FunctionDeclaration') {
    this.exports.push({
      type: 'default',
      kind
    });
    return this;
  }

  withDeclaration(kind, name) {
    this.exports.push({
      type: 'declaration',
      kind,
      name
    });
    return this;
  }

  build() {
    return this.exports;
  }
}

// Factory for creating common parser test scenarios
export class ParserScenarioFactory {
  static emptyFile() {
    return new CodeSampleBuilder().build();
  }

  static singleFunction(name = 'testFunction') {
    return new CodeSampleBuilder()
      .withFunction(name, ['a', 'b'], 'return a + b;')
      .build();
  }

  static multipleFunctions(count = 3) {
    const builder = new CodeSampleBuilder();
    for (let i = 0; i < count; i++) {
      builder.withFunction('func' + i, [], 'return ' + i + ';');
    }
    return builder.build();
  }

  static withImports() {
    return new CodeSampleBuilder()
      .withImport('./module.js', ['foo', 'bar'])
      .withImport('./default.js', ['defaultExport'], { default: true })
      .withImport('./namespace.js', ['ns'], { namespace: true })
      .build();
  }

  static withExports() {
    return new CodeSampleBuilder()
      .withExportDeclaration('const', 'foo', '1')
      .withExportDeclaration('function', 'bar', 'return 1;')
      .withExportDeclaration('class', 'Baz', '')
      .build();
  }

  static classWithMethods(className = 'MyClass', methodCount = 2) {
    const methods = [];
    for (let i = 0; i < methodCount; i++) {
      methods.push({ name: 'method' + i, params: [] });
    }
    return new CodeSampleBuilder()
      .withClass(className, methods)
      .build();
  }

  static typescriptFile() {
    return new CodeSampleBuilder()
      .atFilePath('test.ts')
      .withTSInterface('User', { name: 'string', age: 'number' }, { exported: true })
      .withTSTypeAlias('ID', 'string | number', { exported: true })
      .withTSEnum('Status', { ACTIVE: 1, INACTIVE: 0 }, { exported: true })
      .build();
  }

  static commonJSFile() {
    return new CodeSampleBuilder()
      .withRequire('fs', 'fs')
      .withRequire('path', 'path')
      .withRequire(null, './local-module')
      .build();
  }

  static withDynamicImports() {
    return new CodeSampleBuilder()
      .withDynamicImport('./module-a.js', 'moduleA')
      .withDynamicImport('./module-b.js')
      .build();
  }

  static importCycle(fileA, fileB) {
    return {
      [fileA]: new CodeSampleBuilder()
        .withImport('./' + fileB, ['exportedB'])
        .withExportDeclaration('const', 'exportedA', '1')
        .build(),
      [fileB]: new CodeSampleBuilder()
        .withImport('./' + fileA, ['exportedA'])
        .withExportDeclaration('const', 'exportedB', '2')
        .build()
    };
  }

  static withArrowFunctions() {
    return new CodeSampleBuilder()
      .withArrow('add', ['a', 'b'], 'a + b')
      .withArrow('multiply', ['x', 'y'], 'x * y', { block: true })
      .withArrow('asyncOp', [], 'fetch("/api")', { block: true })
      .build();
  }

  static withFunctionCalls() {
    return new CodeSampleBuilder()
      .withImport('./helpers.js', ['helper'])
      .withCall('helper')
      .withMemberCall('console', 'log', ["'test'"])
      .withMemberCall('obj', 'method', ['arg1', 'arg2'])
      .build();
  }

  static withObjectExports() {
    return new CodeSampleBuilder()
      .withObject('CONFIG', {
        API_URL: '"https://api.example.com"',
        TIMEOUT: '5000',
        RETRIES: '3'
      }, { exported: true })
      .build();
  }
}

// Validation helpers for parser results
export class ParserValidator {
  static isValidFileInfo(result) {
    return result !== null && 
           typeof result === 'object' &&
           typeof result.filePath === 'string' &&
           typeof result.fileName === 'string' &&
           Array.isArray(result.imports) &&
           Array.isArray(result.exports) &&
           Array.isArray(result.definitions);
  }

  static hasRequiredArrays(result) {
    const required = ['imports', 'exports', 'definitions', 'calls', 'functions'];
    return required.every(field => Array.isArray(result[field]));
  }

  static isValidImport(imp) {
    return imp && 
           typeof imp.source === 'string' &&
           typeof imp.type === 'string';
  }

  static isValidExport(exp) {
    return exp && 
           typeof exp.type === 'string';
  }

  static isValidFunction(func) {
    return func && 
           typeof func.name === 'string' &&
           typeof func.type === 'string';
  }

  static isValidClass(cls) {
    return cls && 
           typeof cls.name === 'string' &&
           cls.type === 'class';
  }
}

// Common test data constants
export const PARSER_TEST_CONSTANTS = {
  VALID_JS_FILE: 'test.js',
  VALID_TS_FILE: 'test.ts',
  VALID_JSX_FILE: 'test.jsx',
  VALID_TSX_FILE: 'test.tsx',
  INVALID_FILE: 'test.css',
  
  IMPORT_TYPES: ['esm', 'commonjs', 'dynamic'],
  EXPORT_TYPES: ['named', 'default', 'declaration', 'reexport'],
  FUNCTION_TYPES: ['declaration', 'arrow', 'expression', 'method'],
  DEFINITION_TYPES: ['function', 'class', 'arrow', 'expression', 'method'],
  
  COMMON_PATTERNS: {
    FUNCTION: /function\s+\w+\s*\(/,
    ARROW: /const\s+\w+\s*=\s*\(/,
    CLASS: /class\s+\w+/,
    IMPORT: /import\s+.*from\s+['"]/,
    EXPORT: /export\s+(default\s+)?/,
    REQUIRE: /require\s*\(\s*['"]/
  }
};

// Mock factory for creating test dependencies
export class MockFactory {
  static createMockFileSystem(files) {
    return {
      readFile: async (path) => {
        if (files[path]) {
          return files[path];
        }
        throw new Error('ENOENT: no such file or directory, open ' + path);
      },
      exists: async (path) => path in files
    };
  }

  static createMockParserOptions(overrides = {}) {
    return {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      plugins: ['jsx', 'typescript'],
      ...overrides
    };
  }
}
