/**
 * @fileoverview index.test.js
 * 
 * Tests for the atomic extractor facade (index.js)
 * Tests extractAtoms, extractFunctions, extractClassMethods, extractArrows
 * 
 * @module tests/unit/layer-a-analysis/extractors/atomic/index
 */

import { describe, it, expect } from 'vitest';
import {
  extractAtoms,
  extractFunctions,
  extractClassMethods,
  extractArrows
} from '#layer-a/extractors/atomic/index.js';
import {
  CodeSampleBuilder,
  FunctionBuilder,
  ArrowFunctionBuilder,
  ClassBuilder,
  ExtractionScenarioFactory,
  ExtractionValidator,
  TestConstants
} from '../../../../factories/extractor-test.factory.js';

describe('Atomic Extractor Facade (index)', () => {
  const FILE_PATH = 'test/file.js';

  describe('extractAtoms', () => {
    it('should extract atoms from empty file', () => {
      const scenario = ExtractionScenarioFactory.emptyFile();
      
      const atoms = extractAtoms(scenario.code, FILE_PATH);

      expect(Array.isArray(atoms)).toBe(true);
      expect(atoms).toHaveLength(0);
    });

    it('should extract function declarations', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('func1', [])
        .withFunction('func2', []);
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      expect(atoms.length).toBeGreaterThanOrEqual(2);
      expect(atoms.some(a => a.name === 'func1')).toBe(true);
      expect(atoms.some(a => a.name === 'func2')).toBe(true);
    });

    it('should extract function expressions', () => {
      const builder = new CodeSampleBuilder()
        .withFunctionExpression('expr1', [])
        .withFunctionExpression('expr2', []);
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      expect(atoms.length).toBeGreaterThanOrEqual(2);
      expect(atoms.some(a => a.name === 'expr1')).toBe(true);
      expect(atoms.some(a => a.name === 'expr2')).toBe(true);
    });

    it('should extract arrow functions', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('arrow1', [])
        .withArrow('arrow2', []);
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      expect(atoms.length).toBeGreaterThanOrEqual(2);
      expect(atoms.some(a => a.name === 'arrow1')).toBe(true);
      expect(atoms.some(a => a.name === 'arrow2')).toBe(true);
    });

    it('should extract class methods', () => {
      const builder = new CodeSampleBuilder()
        .withClass('TestClass', [
          { name: 'method1', params: [] },
          { name: 'method2', params: [] }
        ]);
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      expect(atoms.length).toBeGreaterThanOrEqual(2);
      expect(atoms.some(a => a.name === 'method1')).toBe(true);
      expect(atoms.some(a => a.name === 'method2')).toBe(true);
    });

    it('should extract static methods', () => {
      const builder = new CodeSampleBuilder()
        .withClass('TestClass', [
          { name: 'staticMethod', params: [], static: true }
        ]);
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      expect(atoms.some(a => a.name === 'staticMethod' && a.type === TestConstants.ATOM_TYPES.STATIC)).toBe(true);
    });

    it('should extract private methods', () => {
      const builder = new ClassBuilder('TestClass')
        .withPrivateMethod('#privateMethod', []);
      const scenario = builder.buildCodeSample();
      
      const atoms = extractAtoms(scenario.code, FILE_PATH);

      expect(atoms.some(a => a.name === '#privateMethod')).toBe(true);
    });

    it('should extract getters', () => {
      const builder = new ClassBuilder('TestClass')
        .withGetter('value');
      const scenario = builder.buildCodeSample();
      
      const atoms = extractAtoms(scenario.code, FILE_PATH);

      expect(atoms.some(a => a.name === 'value' && a.type === TestConstants.ATOM_TYPES.GETTER)).toBe(true);
    });

    it('should extract setters', () => {
      const builder = new ClassBuilder('TestClass')
        .withSetter('value');
      const scenario = builder.buildCodeSample();
      
      const atoms = extractAtoms(scenario.code, FILE_PATH);

      expect(atoms.some(a => a.name === 'value' && a.type === TestConstants.ATOM_TYPES.SETTER)).toBe(true);
    });

    it('should extract mixed code', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('standalone', [])
        .withArrow('arrow', [])
        .withClass('MyClass', [{ name: 'method', params: [] }]);
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      expect(atoms.length).toBeGreaterThanOrEqual(3);
      expect(atoms.some(a => a.name === 'standalone')).toBe(true);
      expect(atoms.some(a => a.name === 'arrow')).toBe(true);
      expect(atoms.some(a => a.name === 'method')).toBe(true);
    });

    it('should handle exported functions', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('exportedFn', [], '', { exported: true });
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      expect(atoms).toHaveLength(1);
      expect(atoms[0].exported).toBe(true);
    });

    it('should handle default export', () => {
      const builder = new CodeSampleBuilder()
        .withDefaultExportFunction('defaultFn', []);
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      expect(atoms.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for invalid syntax', () => {
      const invalidCode = 'function { broken syntax';
      
      const atoms = extractAtoms(invalidCode, FILE_PATH);

      expect(atoms).toEqual([]);
    });

    it('should return empty array for parse errors', () => {
      const invalidCode = 'const x = {';
      
      const atoms = extractAtoms(invalidCode, FILE_PATH);

      expect(Array.isArray(atoms)).toBe(true);
      expect(atoms).toHaveLength(0);
    });

    it('should not extract nested functions (only top-level)', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('outer', [], `
          function inner() { return 1; }
          return inner();
        `);
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      // Should only extract outer, not inner
      expect(atoms).toHaveLength(1);
      expect(atoms[0].name).toBe('outer');
    });

    it('should set file path on all atoms', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('test', []);
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      expect(atoms.every(a => a.file === FILE_PATH)).toBe(true);
    });

    it('should create unique IDs for all atoms', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('func1', [])
        .withFunction('func2', []);
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      const ids = atoms.map(a => a.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should handle TypeScript syntax', () => {
      const code = `
        function typed(x: number): string {
          return String(x);
        }
        class TypedClass {
          method(y: boolean): void {}
        }
      `;
      
      const atoms = extractAtoms(code, FILE_PATH);

      expect(atoms.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle JSX syntax', () => {
      const code = `
        function Component() {
          return <div>Hello</div>;
        }
      `;
      
      const atoms = extractAtoms(code, FILE_PATH);

      expect(atoms.length).toBeGreaterThanOrEqual(1);
    });

    it('should preserve atom order by line number', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('first', [], '', { exported: true })
        .withFunction('second', [])
        .withArrow('third', []);
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      // Check atoms are in order
      for (let i = 1; i < atoms.length; i++) {
        expect(atoms[i].line).toBeGreaterThanOrEqual(atoms[i-1].line);
      }
    });
  });

  describe('extractFunctions', () => {
    it('should extract only function declarations and expressions', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('decl', [])
        .withFunctionExpression('expr', [])
        .withArrow('arrow', [])
        .withClass('Class', [{ name: 'method', params: [] }]);
      
      const functions = extractFunctions(builder.code, FILE_PATH);

      expect(functions.every(f => 
        f.type === TestConstants.ATOM_TYPES.FUNCTION || 
        f.type === TestConstants.ATOM_TYPES.FUNCTION_EXPRESSION
      )).toBe(true);
    });

    it('should not include arrows', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('decl', [])
        .withArrow('arrow', []);
      
      const functions = extractFunctions(builder.code, FILE_PATH);

      expect(functions.some(f => f.name === 'arrow')).toBe(false);
    });

    it('should not include class methods', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('decl', [])
        .withClass('Class', [{ name: 'method', params: [] }]);
      
      const functions = extractFunctions(builder.code, FILE_PATH);

      expect(functions.some(f => f.name === 'method')).toBe(false);
    });

    it('should return empty array for no functions', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('arrow', [])
        .withClass('Class', [{ name: 'method', params: [] }]);
      
      const functions = extractFunctions(builder.code, FILE_PATH);

      expect(functions).toHaveLength(0);
    });
  });

  describe('extractClassMethods', () => {
    it('should extract regular methods', () => {
      const builder = new CodeSampleBuilder()
        .withClass('Class', [{ name: 'method', params: [] }]);
      
      const methods = extractClassMethods(builder.code, FILE_PATH);

      expect(methods.some(m => m.name === 'method')).toBe(true);
    });

    it('should extract static methods', () => {
      const builder = new CodeSampleBuilder()
        .withClass('Class', [{ name: 'staticMethod', params: [], static: true }]);
      
      const methods = extractClassMethods(builder.code, FILE_PATH);

      expect(methods.some(m => m.name === 'staticMethod' && m.type === TestConstants.ATOM_TYPES.STATIC)).toBe(true);
    });

    it('should extract getters', () => {
      const builder = new ClassBuilder('Class')
        .withGetter('value');
      
      const methods = extractClassMethods(builder.buildCodeSample().code, FILE_PATH);

      expect(methods.some(m => m.name === 'value' && m.type === TestConstants.ATOM_TYPES.GETTER)).toBe(true);
    });

    it('should extract setters', () => {
      const builder = new ClassBuilder('Class')
        .withSetter('value');
      
      const methods = extractClassMethods(builder.buildCodeSample().code, FILE_PATH);

      expect(methods.some(m => m.name === 'value' && m.type === TestConstants.ATOM_TYPES.SETTER)).toBe(true);
    });

    it('should not include function declarations', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('decl', [])
        .withClass('Class', [{ name: 'method', params: [] }]);
      
      const methods = extractClassMethods(builder.code, FILE_PATH);

      expect(methods.some(m => m.name === 'decl')).toBe(false);
    });

    it('should not include arrow functions', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('arrow', [])
        .withClass('Class', [{ name: 'method', params: [] }]);
      
      const methods = extractClassMethods(builder.code, FILE_PATH);

      expect(methods.some(m => m.name === 'arrow')).toBe(false);
    });
  });

  describe('extractArrows', () => {
    it('should extract only arrow functions', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('arrow1', [])
        .withArrow('arrow2', [])
        .withFunction('decl', []);
      
      const arrows = extractArrows(builder.code, FILE_PATH);

      expect(arrows).toHaveLength(2);
      expect(arrows.every(a => a.type === TestConstants.ATOM_TYPES.ARROW)).toBe(true);
    });

    it('should extract exported arrows', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('exportedArrow', [], 'null', { exported: true });
      
      const arrows = extractArrows(builder.code, FILE_PATH);

      expect(arrows).toHaveLength(1);
      expect(arrows[0].name).toBe('exportedArrow');
    });

    it('should not include function declarations', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('decl', [])
        .withArrow('arrow', []);
      
      const arrows = extractArrows(builder.code, FILE_PATH);

      expect(arrows.some(a => a.name === 'decl')).toBe(false);
    });

    it('should not include class methods', () => {
      const builder = new CodeSampleBuilder()
        .withClass('Class', [{ name: 'method', params: [] }])
        .withArrow('arrow', []);
      
      const arrows = extractArrows(builder.code, FILE_PATH);

      expect(arrows.some(a => a.name === 'method')).toBe(false);
    });

    it('should return empty array for no arrows', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('decl', [])
        .withClass('Class', [{ name: 'method', params: [] }]);
      
      const arrows = extractArrows(builder.code, FILE_PATH);

      expect(arrows).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle syntax errors gracefully', () => {
      const invalidCodes = [
        'function {',
        'const x = {',
        'class {',
        '=> broken',
        'function test(,) {}'
      ];

      invalidCodes.forEach(code => {
        expect(() => extractAtoms(code, FILE_PATH)).not.toThrow();
        const result = extractAtoms(code, FILE_PATH);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should handle empty string', () => {
      const atoms = extractAtoms('', FILE_PATH);

      expect(atoms).toEqual([]);
    });

    it('should handle whitespace only', () => {
      const atoms = extractAtoms('   \n\n   ', FILE_PATH);

      expect(atoms).toEqual([]);
    });

    it('should handle comments only', () => {
      const code = `
        // This is a comment
        /* Multi-line
           comment */
      `;
      
      const atoms = extractAtoms(code, FILE_PATH);

      expect(atoms).toEqual([]);
    });
  });

  describe('Factory pattern integration', () => {
    it('should work with FunctionBuilder', () => {
      const builder = new FunctionBuilder('factoryFunc')
        .withParams('a', 'b')
        .isAsync()
        .buildCodeSample();
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      expect(atoms).toHaveLength(1);
      expect(atoms[0].name).toBe('factoryFunc');
      expect(atoms[0].signature.async).toBe(true);
    });

    it('should work with ArrowFunctionBuilder', () => {
      const builder = new ArrowFunctionBuilder('factoryArrow')
        .withParams('x')
        .isAsync()
        .buildCodeSample();
      
      const atoms = extractAtoms(builder.code, FILE_PATH);

      expect(atoms).toHaveLength(1);
      expect(atoms[0].name).toBe('factoryArrow');
    });

    it('should work with ClassBuilder', () => {
      const builder = new ClassBuilder('FactoryClass')
        .withMethod('method', [])
        .withStaticMethod('static', [])
        .withGetter('value');
      
      const atoms = extractAtoms(builder.buildCodeSample().code, FILE_PATH);

      expect(atoms.length).toBeGreaterThanOrEqual(3);
    });

    it('should work with ExtractionScenarioFactory', () => {
      const scenario = ExtractionScenarioFactory.classWithAllMethodTypes('ScenarioClass');
      
      const atoms = extractAtoms(scenario.code, FILE_PATH);

      expect(atoms.length).toBeGreaterThanOrEqual(5);
    });
  });
});
