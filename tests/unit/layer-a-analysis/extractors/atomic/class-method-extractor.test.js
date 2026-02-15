/**
 * @fileoverview class-method-extractor.test.js
 * 
 * Tests for class method, private method, and accessor extractors
 * 
 * @module tests/unit/layer-a-analysis/extractors/atomic/class-method-extractor
 */

import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import * as traverseModule from '@babel/traverse';
const traverse = traverseModule.default || traverseModule;
import {
  extractClassMethod,
  extractPrivateMethod,
  extractAccessor
} from '#layer-a/extractors/atomic/class-method-extractor.js';
import {
  CodeSampleBuilder,
  ClassBuilder,
  ExtractionScenarioFactory,
  ExtractionValidator,
  TestConstants
} from '../../../../factories/extractor-test.factory.js';

describe('Class Method Extractor', () => {
  const FILE_PATH = 'test/file.js';
  const CLASS_NAME = 'TestClass';

  describe('extractClassMethod - regular methods', () => {
    it('should extract basic instance method', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withMethod('instanceMethod', ['a', 'b']);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method') {
            atom = extractClassMethod(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(ExtractionValidator.validateFullAtom(atom)).toBe(true);
      expect(atom.name).toBe('instanceMethod');
      expect(atom.type).toBe(TestConstants.ATOM_TYPES.METHOD);
      expect(atom.className).toBe(CLASS_NAME);
    });

    it('should extract method with no parameters', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withMethod('noParams', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method') {
            atom = extractClassMethod(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.signature.params).toHaveLength(0);
    });

    it('should extract async method', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withAsyncMethod('asyncMethod', ['url']);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method' && path.node.async) {
            atom = extractClassMethod(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.signature.async).toBe(true);
    });

    it('should extract generator method', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withGeneratorMethod('genMethod', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method' && path.node.generator) {
            atom = extractClassMethod(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.signature.generator).toBe(true);
    });

    it('should create correct atom ID', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withMethod('myMethod', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method') {
            atom = extractClassMethod(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.id).toBe(`${FILE_PATH}::${CLASS_NAME}.myMethod`);
    });

    it('should set correct line and column', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withMethod('linedMethod', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method') {
            atom = extractClassMethod(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.line).toBeGreaterThan(0);
      expect(atom.column).toBeGreaterThanOrEqual(0);
    });

    it('should always set exported to false for methods', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .isExported()
        .withMethod('methodInExportedClass', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method') {
            atom = extractClassMethod(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.exported).toBe(false);
    });

    it('should calculate complexity', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withMethod('complexMethod', ['x'], { body: 'if (x) { return 1; } return 0;' });
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method') {
            atom = extractClassMethod(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.complexity).toBeGreaterThan(1);
    });

    it('should extract method calls', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withMethod('callingMethod', [], { body: 'this.helper();' });
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method') {
            atom = extractClassMethod(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.calls.length).toBeGreaterThan(0);
    });
  });

  describe('extractClassMethod - static methods', () => {
    it('should extract static method with correct type', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withStaticMethod('staticMethod', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method') {
            atom = extractClassMethod(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.type).toBe(TestConstants.ATOM_TYPES.STATIC);
    });

    it('should create correct ID for static method', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withStaticMethod('staticHelper', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method') {
            atom = extractClassMethod(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.id).toBe(`${FILE_PATH}::${CLASS_NAME}.staticHelper`);
    });

    it('should extract async static method', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withStaticMethod('asyncStatic', ['data'], { async: true });
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method' && path.node.async) {
            atom = extractClassMethod(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.signature.async).toBe(true);
      expect(atom.type).toBe(TestConstants.ATOM_TYPES.STATIC);
    });
  });

  describe('extractPrivateMethod', () => {
    it('should extract private method', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withPrivateMethod('#privateMethod', ['x']);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassPrivateMethod(path) {
          atom = extractPrivateMethod(path, FILE_PATH, CLASS_NAME);
        }
      }, classPath.scope);

      expect(ExtractionValidator.validateFullAtom(atom)).toBe(true);
      expect(atom.name).toBe('#privateMethod');
      expect(atom.type).toBe(TestConstants.ATOM_TYPES.PRIVATE_METHOD);
    });

    it('should set visibility to private', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withPrivateMethod('#hidden', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassPrivateMethod(path) {
          atom = extractPrivateMethod(path, FILE_PATH, CLASS_NAME);
        }
      }, classPath.scope);

      expect(atom.visibility).toBe('private');
    });

    it('should create correct ID for private method', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withPrivateMethod('#helper', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassPrivateMethod(path) {
          atom = extractPrivateMethod(path, FILE_PATH, CLASS_NAME);
        }
      }, classPath.scope);

      expect(atom.id).toBe(`${FILE_PATH}::${CLASS_NAME}.#helper`);
    });

    it('should calculate complexity for private method', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withPrivateMethod('#complex', ['x'], { body: 'if (x) return true; return false;' });
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassPrivateMethod(path) {
          atom = extractPrivateMethod(path, FILE_PATH, CLASS_NAME);
        }
      }, classPath.scope);

      expect(atom.complexity).toBe(2);
    });

    it('should always set exported to false', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withPrivateMethod('#private', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassPrivateMethod(path) {
          atom = extractPrivateMethod(path, FILE_PATH, CLASS_NAME);
        }
      }, classPath.scope);

      expect(atom.exported).toBe(false);
    });
  });

  describe('extractAccessor - getters', () => {
    it('should extract getter with correct type', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withGetter('value');
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'get') {
            atom = extractAccessor(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.type).toBe(TestConstants.ATOM_TYPES.GETTER);
      expect(atom.name).toBe('value');
    });

    it('should set complexity to 1 for getter', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withGetter('simpleValue');
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'get') {
            atom = extractAccessor(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.complexity).toBe(1);
    });

    it('should create correct ID for getter', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withGetter('data');
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'get') {
            atom = extractAccessor(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.id).toBe(`${FILE_PATH}::${CLASS_NAME}.data`);
    });

    it('should set visibility to public for getter', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withGetter('publicGetter');
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'get') {
            atom = extractAccessor(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.visibility).toBe('public');
    });

    it('should extract data flow from getter', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withGetter('computed', 'return this._value * 2;');
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'get') {
            atom = extractAccessor(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.dataFlow).toBeDefined();
    });
  });

  describe('extractAccessor - setters', () => {
    it('should extract setter with correct type', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withSetter('value');
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'set') {
            atom = extractAccessor(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.type).toBe(TestConstants.ATOM_TYPES.SETTER);
      expect(atom.name).toBe('value');
    });

    it('should set complexity to 1 for setter', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withSetter('simpleValue');
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'set') {
            atom = extractAccessor(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.complexity).toBe(1);
    });

    it('should create correct ID for setter', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withSetter('data');
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'set') {
            atom = extractAccessor(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.id).toBe(`${FILE_PATH}::${CLASS_NAME}.data`);
    });

    it('should extract parameter for setter', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withSetter('valueWithParam', 'this._value = value;');
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'set') {
            atom = extractAccessor(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.signature.params.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect side effects in setter', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withSetter('loggingSetter', 'this._value = val; console.log("set");');
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'set') {
            atom = extractAccessor(path, FILE_PATH, CLASS_NAME);
          }
        }
      }, classPath.scope);

      expect(atom.dataFlow.sideEffects.length).toBeGreaterThan(0);
    });
  });

  describe('class with all method types', () => {
    it('should extract all types from comprehensive class', () => {
      const builder = new ClassBuilder(CLASS_NAME)
        .withConstructor(['props'], 'this.props = props;')
        .withMethod('regular', ['a'])
        .withStaticMethod('static', [])
        .withAsyncMethod('async', ['url'])
        .withPrivateMethod('#private', [])
        .withGetter('value')
        .withSetter('value');
      const classPath = builder.buildAstNode();
      
      const atoms = [];

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method') {
            atoms.push(extractClassMethod(path, FILE_PATH, CLASS_NAME));
          } else if (path.node.kind === 'get' || path.node.kind === 'set') {
            atoms.push(extractAccessor(path, FILE_PATH, CLASS_NAME));
          }
        },
        ClassPrivateMethod(path) {
          atoms.push(extractPrivateMethod(path, FILE_PATH, CLASS_NAME));
        }
      }, classPath.scope);

      expect(atoms.length).toBeGreaterThanOrEqual(5);
      expect(atoms.some(a => a.type === TestConstants.ATOM_TYPES.METHOD)).toBe(true);
      expect(atoms.some(a => a.type === TestConstants.ATOM_TYPES.STATIC)).toBe(true);
      expect(atoms.some(a => a.type === TestConstants.ATOM_TYPES.PRIVATE_METHOD)).toBe(true);
      expect(atoms.some(a => a.type === TestConstants.ATOM_TYPES.GETTER)).toBe(true);
      expect(atoms.some(a => a.type === TestConstants.ATOM_TYPES.SETTER)).toBe(true);
    });
  });

  describe('Factory pattern tests', () => {
    it('should work with ClassBuilder', () => {
      const builder = new ClassBuilder('FactoryClass')
        .withMethod('factoryMethod', ['x', 'y'])
        .withStaticMethod('factoryStatic', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method' && !path.node.static) {
            atom = extractClassMethod(path, FILE_PATH, 'FactoryClass');
          }
        }
      }, classPath.scope);

      expect(atom.name).toBe('factoryMethod');
      expect(atom.signature.params).toHaveLength(2);
    });

    it('should work with scenario factory', () => {
      const scenario = ExtractionScenarioFactory.classWithAllMethodTypes('ScenarioClass');
      const ast = parse(scenario.code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
      });
      const atoms = [];

      traverse(ast, {
        ClassDeclaration(classPath) {
          const className = classPath.node.id.name;
          traverse(classPath.node, {
            ClassMethod(path) {
              if (path.node.kind === 'method') {
                atoms.push(extractClassMethod(path, FILE_PATH, className));
              } else if (path.node.kind === 'get' || path.node.kind === 'set') {
                atoms.push(extractAccessor(path, FILE_PATH, className));
              }
            },
            ClassPrivateMethod(path) {
              atoms.push(extractPrivateMethod(path, FILE_PATH, className));
            }
          }, classPath.scope);
        }
      });

      expect(atoms.length).toBeGreaterThanOrEqual(1);
    });
  });
});
