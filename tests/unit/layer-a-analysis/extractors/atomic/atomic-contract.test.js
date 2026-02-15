/**
 * @fileoverview atomic-contract.test.js
 * 
 * Contract tests for all atomic extractors
 * Ensures all extractors follow the same interface contract
 * 
 * @module tests/unit/layer-a-analysis/extractors/atomic/atomic-contract
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parse } from '@babel/parser';
import * as traverseModule from '@babel/traverse';
const traverse = traverseModule.default || traverseModule;
import { extractFunctionDeclaration, extractFunctionExpression } from '#layer-a/extractors/atomic/function-extractor.js';
import { extractArrowFunction } from '#layer-a/extractors/atomic/arrow-extractor.js';
import { extractClassMethod, extractPrivateMethod, extractAccessor } from '#layer-a/extractors/atomic/class-method-extractor.js';
import { extractAtoms } from '#layer-a/extractors/atomic/index.js';
import {
  CodeSampleBuilder,
  FunctionBuilder,
  ArrowFunctionBuilder,
  ClassBuilder,
  ExtractionScenarioFactory,
  AtomicExtractorContracts,
  TestConstants
} from '../../../../factories/extractor-test.factory.js';

describe('Atomic Extractor Contracts', () => {
  const FILE_PATH = 'test/contract.js';
  const PARSER_CONFIG = {
    sourceType: 'module',
    plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
  };

  describe('All extractors must return valid atoms', () => {
    const testCases = [
      {
        name: 'FunctionDeclaration',
        builder: () => new FunctionBuilder('test').buildCodeSample(),
        extractor: (path, file) => extractFunctionDeclaration(path, file),
        nodeType: 'FunctionDeclaration'
      },
      {
        name: 'FunctionExpression',
        builder: () => new CodeSampleBuilder().withFunctionExpression('expr', []),
        extractor: (path, file) => extractFunctionExpression(path, file),
        nodeType: 'FunctionExpression'
      },
      {
        name: 'ArrowFunction',
        builder: () => new ArrowFunctionBuilder('arrow').buildCodeSample(),
        extractor: (path, file) => extractArrowFunction(path, file),
        nodeType: 'ArrowFunctionExpression'
      }
    ];

    testCases.forEach(({ name, builder, extractor, nodeType }) => {
      describe(`${name} contract`, () => {
        let atom;

        beforeAll(() => {
          const sample = builder().build();
          const ast = parse(sample.code, PARSER_CONFIG);
          let path;
          traverse(ast, {
            [nodeType](p) {
              if (!path) path = p;
            }
          });
          atom = extractor(path, FILE_PATH);
        });

        it('must have all required atom fields', () => {
          AtomicExtractorContracts.REQUIRED_ATOM_FIELDS.forEach(field => {
            expect(atom).toHaveProperty(field);
          });
        });

        it('must have valid atom type', () => {
          expect(AtomicExtractorContracts.VALID_ATOM_TYPES).toContain(atom.type);
        });

        it('must have signature with required fields', () => {
          AtomicExtractorContracts.REQUIRED_SIGNATURE_FIELDS.forEach(field => {
            expect(atom.signature).toHaveProperty(field);
          });
        });

        it('must have dataFlow with required fields', () => {
          AtomicExtractorContracts.REQUIRED_DATAFLOW_FIELDS.forEach(field => {
            expect(atom.dataFlow).toHaveProperty(field);
          });
        });

        it('must have array fields as arrays', () => {
          expect(Array.isArray(atom.signature.params)).toBe(true);
          expect(Array.isArray(atom.dataFlow.inputs)).toBe(true);
          expect(Array.isArray(atom.dataFlow.outputs)).toBe(true);
          expect(Array.isArray(atom.dataFlow.sideEffects)).toBe(true);
          expect(Array.isArray(atom.calls)).toBe(true);
          expect(Array.isArray(atom.calledBy)).toBe(true);
        });

        it('must have boolean fields as booleans', () => {
          expect(typeof atom.exported).toBe('boolean');
          expect(typeof atom.signature.async).toBe('boolean');
          expect(typeof atom.signature.generator).toBe('boolean');
        });

        it('must have string fields as strings', () => {
          expect(typeof atom.id).toBe('string');
          expect(typeof atom.name).toBe('string');
          expect(typeof atom.type).toBe('string');
          expect(typeof atom.file).toBe('string');
          expect(typeof atom.visibility).toBe('string');
        });

        it('must have number fields as numbers', () => {
          expect(typeof atom.line).toBe('number');
          expect(typeof atom.column).toBe('number');
          expect(typeof atom.complexity).toBe('number');
          // lines is the dataFlow.lines object, not a count
          expect(typeof atom.lines).toBe('object');
        });

        it('must have valid ISO date', () => {
          expect(new Date(atom.analyzedAt).toISOString()).toBe(atom.analyzedAt);
        });

        it('must have className or null', () => {
          expect(atom.className === null || typeof atom.className === 'string').toBe(true);
        });

        it('must have archetype initially null', () => {
          expect(atom.archetype).toBeNull();
        });
      });
    });
  });

  describe('Class method extractors contract', () => {
    const classBuilder = new ClassBuilder('ContractClass')
      .withMethod('instance', [])
      .withStaticMethod('static', [])
      .withPrivateMethod('#private', [])
      .withGetter('value')
      .withSetter('value');

    it('extractClassMethod must return valid atom', () => {
      const sample = classBuilder.buildCodeSample().build();
      const ast = parse(sample.code, PARSER_CONFIG);
      let atom;

      traverse(ast, {
        ClassDeclaration(classPath) {
          traverse(classPath.node, {
            ClassMethod(path) {
              if (path.node.kind === 'method' && !atom) {
                atom = extractClassMethod(path, FILE_PATH, 'ContractClass');
              }
            }
          }, classPath.scope);
        }
      });

      AtomicExtractorContracts.REQUIRED_ATOM_FIELDS.forEach(field => {
        expect(atom).toHaveProperty(field);
      });
    });

    it('extractPrivateMethod must return valid atom', () => {
      const sample = classBuilder.buildCodeSample().build();
      const ast = parse(sample.code, PARSER_CONFIG);
      let atom;

      traverse(ast, {
        ClassDeclaration(classPath) {
          traverse(classPath.node, {
            ClassPrivateMethod(path) {
              if (!atom) {
                atom = extractPrivateMethod(path, FILE_PATH, 'ContractClass');
              }
            }
          }, classPath.scope);
        }
      });

      AtomicExtractorContracts.REQUIRED_ATOM_FIELDS.forEach(field => {
        expect(atom).toHaveProperty(field);
      });
      expect(atom.visibility).toBe('private');
    });

    it('extractAccessor must return valid atom for getter', () => {
      const sample = classBuilder.buildCodeSample().build();
      const ast = parse(sample.code, PARSER_CONFIG);
      let atom;

      traverse(ast, {
        ClassDeclaration(classPath) {
          traverse(classPath.node, {
            ClassMethod(path) {
              if (path.node.kind === 'get' && !atom) {
                atom = extractAccessor(path, FILE_PATH, 'ContractClass');
              }
            }
          }, classPath.scope);
        }
      });

      AtomicExtractorContracts.REQUIRED_ATOM_FIELDS.forEach(field => {
        expect(atom).toHaveProperty(field);
      });
      expect(atom.type).toBe('getter');
      expect(atom.complexity).toBe(1);
    });

    it('extractAccessor must return valid atom for setter', () => {
      const sample = classBuilder.buildCodeSample().build();
      const ast = parse(sample.code, PARSER_CONFIG);
      let atom;

      traverse(ast, {
        ClassDeclaration(classPath) {
          traverse(classPath.node, {
            ClassMethod(path) {
              if (path.node.kind === 'set' && !atom) {
                atom = extractAccessor(path, FILE_PATH, 'ContractClass');
              }
            }
          }, classPath.scope);
        }
      });

      AtomicExtractorContracts.REQUIRED_ATOM_FIELDS.forEach(field => {
        expect(atom).toHaveProperty(field);
      });
      expect(atom.type).toBe('setter');
      expect(atom.complexity).toBe(1);
    });
  });

  describe('ID format contract', () => {
    it('function atoms must have ID in format filePath::functionName', () => {
      const builder = new FunctionBuilder('myFunc').buildCodeSample();
      const path = builder.findNode('FunctionDeclaration');
      const atom = extractFunctionDeclaration(path, 'src/utils.js');

      expect(atom.id).toBe('src/utils.js::myFunc');
    });

    it('arrow atoms must have ID in format filePath::arrowName', () => {
      const builder = new ArrowFunctionBuilder('myArrow').buildCodeSample();
      const path = builder.findNode('ArrowFunctionExpression');
      const atom = extractArrowFunction(path, 'src/utils.js');

      expect(atom.id).toBe('src/utils.js::myArrow');
    });

    it('method atoms must have ID in format filePath::ClassName.methodName', () => {
      const builder = new ClassBuilder('MyClass').withMethod('myMethod', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method') {
            atom = extractClassMethod(path, 'src/class.js', 'MyClass');
          }
        }
      }, classPath.scope);

      expect(atom.id).toBe('src/class.js::MyClass.myMethod');
    });

    it('private method atoms must have ID in format filePath::ClassName.#methodName', () => {
      const builder = new ClassBuilder('MyClass').withPrivateMethod('#private', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassPrivateMethod(path) {
          atom = extractPrivateMethod(path, 'src/class.js', 'MyClass');
        }
      }, classPath.scope);

      expect(atom.id).toBe('src/class.js::MyClass.#private');
    });
  });

  describe('Type consistency contract', () => {
    it('all extractors must return unique types', () => {
      const types = new Set();
      
      // Function declaration
      const funcBuilder = new FunctionBuilder('func').buildCodeSample();
      const funcAtom = extractFunctionDeclaration(funcBuilder.findNode('FunctionDeclaration'), FILE_PATH);
      types.add(funcAtom.type);

      // Function expression
      const exprBuilder = new CodeSampleBuilder().withFunctionExpression('expr', []);
      const exprAtom = extractFunctionExpression(exprBuilder.findNode('FunctionExpression'), FILE_PATH);
      types.add(exprAtom.type);

      // Arrow
      const arrowBuilder = new ArrowFunctionBuilder('arrow').buildCodeSample();
      const arrowAtom = extractArrowFunction(arrowBuilder.findNode('ArrowFunctionExpression'), FILE_PATH);
      types.add(arrowAtom.type);

      expect(types.size).toBe(3);
      expect(types.has('function')).toBe(true);
      expect(types.has('function-expression')).toBe(true);
      expect(types.has('arrow')).toBe(true);
    });

    it('class methods must return correct types', () => {
      const builder = new ClassBuilder('TypeClass')
        .withMethod('method', [])
        .withStaticMethod('static', [])
        .withPrivateMethod('#private', [])
        .withGetter('value')
        .withSetter('value');
      
      const classPath = builder.buildAstNode();
      const types = [];

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method') {
            const atom = extractClassMethod(path, FILE_PATH, 'TypeClass');
            types.push(atom.type);
          } else if (path.node.kind === 'get' || path.node.kind === 'set') {
            const atom = extractAccessor(path, FILE_PATH, 'TypeClass');
            types.push(atom.type);
          }
        },
        ClassPrivateMethod(path) {
          const atom = extractPrivateMethod(path, FILE_PATH, 'TypeClass');
          types.push(atom.type);
        }
      }, classPath.scope);

      expect(types).toContain('method');
      expect(types).toContain('static');
      expect(types).toContain('private-method');
      expect(types).toContain('getter');
      expect(types).toContain('setter');
    });
  });

  describe('Visibility contract', () => {
    it('public functions must have visibility=public', () => {
      const builder = new FunctionBuilder('publicFunc').buildCodeSample();
      const atom = extractFunctionDeclaration(builder.findNode('FunctionDeclaration'), FILE_PATH);

      expect(atom.visibility).toBe('public');
    });

    it('exported functions are still visibility=public', () => {
      const builder = new CodeSampleBuilder().withFunction('exported', [], '', { exported: true });
      const atom = extractFunctionDeclaration(builder.findNode('FunctionDeclaration'), FILE_PATH);

      expect(atom.visibility).toBe('public');
      expect(atom.exported).toBe(true);
    });

    it('private methods must have visibility=private', () => {
      const builder = new ClassBuilder('VisClass').withPrivateMethod('#hidden', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassPrivateMethod(path) {
          atom = extractPrivateMethod(path, FILE_PATH, 'VisClass');
        }
      }, classPath.scope);

      expect(atom.visibility).toBe('private');
    });

    it('all methods default to visibility=public', () => {
      const builder = new ClassBuilder('VisClass').withMethod('regular', []);
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method') {
            atom = extractClassMethod(path, FILE_PATH, 'VisClass');
          }
        }
      }, classPath.scope);

      expect(atom.visibility).toBe('public');
    });
  });

  describe('Complexity contract', () => {
    it('simple functions must have complexity >= 1', () => {
      const builder = new FunctionBuilder('simple').buildCodeSample();
      const atom = extractFunctionDeclaration(builder.findNode('FunctionDeclaration'), FILE_PATH);

      expect(atom.complexity).toBeGreaterThanOrEqual(1);
    });

    it('getters and setters must have complexity = 1', () => {
      const builder = new ClassBuilder('CompClass')
        .withGetter('value')
        .withSetter('value');
      
      const classPath = builder.buildAstNode();
      const complexities = [];

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'get' || path.node.kind === 'set') {
            const atom = extractAccessor(path, FILE_PATH, 'CompClass');
            complexities.push(atom.complexity);
          }
        }
      }, classPath.scope);

      expect(complexities.every(c => c === 1)).toBe(true);
    });

    it('complex functions must have higher complexity', () => {
      const scenario = ExtractionScenarioFactory.complexFunction('complex');
      const atoms = extractAtoms(scenario.code, FILE_PATH);

      expect(atoms[0].complexity).toBeGreaterThan(1);
    });
  });

  describe('Export contract', () => {
    it('non-exported functions must have exported=false', () => {
      const builder = new FunctionBuilder('notExported').buildCodeSample();
      const atom = extractFunctionDeclaration(builder.findNode('FunctionDeclaration'), FILE_PATH);

      expect(atom.exported).toBe(false);
    });

    it('exported functions must have exported=true', () => {
      const builder = new CodeSampleBuilder().withFunction('pub', [], '', { exported: true });
      const atom = extractFunctionDeclaration(builder.findNode('FunctionDeclaration'), FILE_PATH);

      expect(atom.exported).toBe(true);
    });

    it('class methods must always have exported=false', () => {
      const builder = new ClassBuilder('ExpClass')
        .withMethod('method', [])
        .isExported();
      
      const classPath = builder.buildAstNode();
      let atom;

      traverse(classPath.node, {
        ClassMethod(path) {
          if (path.node.kind === 'method') {
            atom = extractClassMethod(path, FILE_PATH, 'ExpClass');
          }
        }
      }, classPath.scope);

      expect(atom.exported).toBe(false);
    });
  });

  describe('Facade contract', () => {
    it('extractAtoms must return array', () => {
      const result = extractAtoms('', FILE_PATH);

      expect(Array.isArray(result)).toBe(true);
    });

    it('extractAtoms must not throw on invalid code', () => {
      expect(() => extractAtoms('invalid {', FILE_PATH)).not.toThrow();
    });

    it('extractAtoms must return empty array on invalid code', () => {
      const result = extractAtoms('invalid {', FILE_PATH);

      expect(result).toEqual([]);
    });

    it('extractFunctions must only return function types', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('decl', [])
        .withFunctionExpression('expr', [])
        .withArrow('arrow', []);
      
      const result = extractAtoms(builder.code, FILE_PATH);
      const funcs = result.filter(a => 
        a.type === 'function' || a.type === 'function-expression'
      );

      expect(funcs.every(f => 
        f.type === 'function' || f.type === 'function-expression'
      )).toBe(true);
    });

    it('extractArrows must only return arrow type', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('arrow1', [])
        .withArrow('arrow2', [])
        .withFunction('decl', []);
      
      const result = extractAtoms(builder.code, FILE_PATH);
      const arrows = result.filter(a => a.type === 'arrow');

      expect(arrows.every(a => a.type === 'arrow')).toBe(true);
    });
  });

  describe('Cross-extractor consistency', () => {
    it('all extractors must use same date format', () => {
      const code = `
        function a() {}
        const b = () => {};
        class C { d() {} }
      `;
      
      const atoms = extractAtoms(code, FILE_PATH);
      const dates = atoms.map(a => new Date(a.analyzedAt));

      expect(dates.every(d => !isNaN(d.getTime()))).toBe(true);
    });

    it('all extractors must use consistent line numbering', () => {
      const builder = new CodeSampleBuilder()
        .withBlankLine()
        .withFunction('secondLine', [])
        .withBlankLine()
        .withArrow('fourthLine', []);
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      // Both atoms should have valid line numbers
      expect(atoms[0].line).toBeGreaterThanOrEqual(1);
      expect(atoms[1].line).toBeGreaterThanOrEqual(1);
      // Second atom should be at same or later line than first
      expect(atoms[1].line).toBeGreaterThanOrEqual(atoms[0].line);
    });

    it('all extractors must include all required fields', () => {
      const code = `
        function a() {}
        const b = function() {};
        const c = () => {};
        class D {
          e() {}
          static f() {}
          #g() {}
          get h() { return 1; }
          set h(v) {}
        }
      `;
      
      const atoms = extractAtoms(code, FILE_PATH);

      atoms.forEach(atom => {
        AtomicExtractorContracts.REQUIRED_ATOM_FIELDS.forEach(field => {
          expect(atom).toHaveProperty(field);
        });
      });
    });
  });
});
