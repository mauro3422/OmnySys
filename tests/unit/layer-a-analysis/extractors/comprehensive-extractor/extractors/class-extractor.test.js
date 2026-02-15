/**
 * @fileoverview class-extractor.test.js
 * 
 * Tests for the legacy class-extractor wrapper
 * 
 * @module tests/unit/layer-a-analysis/extractors/comprehensive-extractor/extractors/class-extractor
 */

import { describe, it, expect } from 'vitest';
import * as ClassExtractor from '#layer-a/extractors/comprehensive-extractor/extractors/class-extractor.js';

describe('Class Extractor - Legacy Wrapper', () => {
  describe('Exports', () => {
    it('should export extractClasses', () => {
      expect(ClassExtractor.extractClasses).toBeDefined();
      expect(typeof ClassExtractor.extractClasses).toBe('function');
    });

    it('should export extractClassMethods', () => {
      expect(ClassExtractor.extractClassMethods).toBeDefined();
      expect(typeof ClassExtractor.extractClassMethods).toBe('function');
    });

    it('should export extractClassProperties', () => {
      expect(ClassExtractor.extractClassProperties).toBeDefined();
      expect(typeof ClassExtractor.extractClassProperties).toBe('function');
    });

    it('should export extractInheritanceHierarchy', () => {
      expect(ClassExtractor.extractInheritanceHierarchy).toBeDefined();
      expect(typeof ClassExtractor.extractInheritanceHierarchy).toBe('function');
    });

    it('should export calculateInheritanceDepth', () => {
      expect(ClassExtractor.calculateInheritanceDepth).toBeDefined();
      expect(typeof ClassExtractor.calculateInheritanceDepth).toBe('function');
    });

    it('should export extractMixins', () => {
      expect(ClassExtractor.extractMixins).toBeDefined();
      expect(typeof ClassExtractor.extractMixins).toBe('function');
    });

    it('should export extractClassBody', () => {
      expect(ClassExtractor.extractClassBody).toBeDefined();
      expect(typeof ClassExtractor.extractClassBody).toBe('function');
    });

    it('should export extractImplements', () => {
      expect(ClassExtractor.extractImplements).toBeDefined();
      expect(typeof ClassExtractor.extractImplements).toBe('function');
    });

    it('should export extractDecorators', () => {
      expect(ClassExtractor.extractDecorators).toBeDefined();
      expect(typeof ClassExtractor.extractDecorators).toBe('function');
    });

    it('should export default', () => {
      expect(ClassExtractor.default).toBeDefined();
      expect(typeof ClassExtractor.default).toBe('object');
    });
  });

  describe('Re-export Integrity', () => {
    it('extractClasses should be callable', () => {
      const code = 'class Test {}';
      const result = ClassExtractor.extractClasses(code);
      expect(result).toBeDefined();
    });

    it('extractClassMethods should be callable', () => {
      const classBody = 'method1() {} method2() {}';
      const result = ClassExtractor.extractClassMethods(classBody);
      expect(Array.isArray(result)).toBe(true);
    });

    it('extractClassProperties should be callable', () => {
      const classBody = 'prop1; prop2;';
      const result = ClassExtractor.extractClassProperties(classBody);
      expect(Array.isArray(result)).toBe(true);
    });

    it('extractInheritanceHierarchy should be callable', () => {
      const classes = [{ name: 'Child', superClass: 'Parent' }];
      const result = ClassExtractor.extractInheritanceHierarchy(classes);
      expect(typeof result).toBe('object');
    });

    it('calculateInheritanceDepth should be callable', () => {
      const classes = [{ name: 'Child', superClass: 'Parent' }];
      const result = ClassExtractor.calculateInheritanceDepth(classes);
      expect(typeof result).toBe('number');
    });

    it('extractMixins should be callable', () => {
      const code = 'class MyClass extends Mixin(Base) {}';
      const result = ClassExtractor.extractMixins(code);
      expect(Array.isArray(result)).toBe(true);
    });

    it('extractClassBody should be callable', () => {
      const code = 'class Test { method() {} }';
      const cls = { name: 'Test', start: 0 };
      const result = ClassExtractor.extractClassBody(code, cls);
      expect(typeof result).toBe('string');
    });

    it('extractImplements should be callable', () => {
      const code = 'class Test implements Interface {}';
      const cls = { name: 'Test', start: 0 };
      const result = ClassExtractor.extractImplements(code, cls);
      expect(Array.isArray(result)).toBe(true);
    });

    it('extractDecorators should be callable', () => {
      const code = '@Component class Test {}';
      const cls = { name: 'Test', start: 12 };
      const result = ClassExtractor.extractDecorators(code, cls);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
