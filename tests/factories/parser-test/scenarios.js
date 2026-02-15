/**
 * @fileoverview Parser Test Factory - Scenarios
 */

import { CodeSampleBuilder } from './builders.js';

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

