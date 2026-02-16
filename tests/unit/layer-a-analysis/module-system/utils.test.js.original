/**
 * @fileoverview Module System Utils Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/utils
 */

import { describe, it, expect } from 'vitest';
import {
  findMolecule,
  getAllAtoms,
  camelToKebab,
  inferModuleFromCall,
  getFileName,
  classifySideEffects,
  aggregateSideEffects
} from '../../../../src/layer-a-static/module-system/utils.js';
import { 
  ModuleBuilder, 
  createMockMolecule,
  createMockAtom 
} from '../../../factories/module-system-test.factory.js';

describe('Module System Utils', () => {
  // ============================================================================
  // findMolecule
  // ============================================================================
  describe('findMolecule', () => {
    it('should find molecule by file path', () => {
      const modules = [
        ModuleBuilder.create('mod1')
          .withMolecule('src/mod1/file.js', [{ name: 'func1' }])
          .build(),
        ModuleBuilder.create('mod2')
          .withMolecule('src/mod2/file.js', [{ name: 'func2' }])
          .build()
      ];

      const found = findMolecule('src/mod1/file.js', modules);
      
      expect(found).toBeDefined();
      expect(found.filePath).toBe('src/mod1/file.js');
      expect(found.atoms[0].name).toBe('func1');
    });

    it('should return null when molecule not found', () => {
      const modules = [ModuleBuilder.create('mod1').build()];
      
      const found = findMolecule('nonexistent.js', modules);
      
      expect(found).toBeNull();
    });

    it('should return null for empty modules array', () => {
      const found = findMolecule('file.js', []);
      expect(found).toBeNull();
    });

    it('should find molecule in first matching module', () => {
      const molecule = createMockMolecule('src/shared.js', [{ name: 'helper' }]);
      const modules = [
        { moduleName: 'mod1', molecules: [molecule] },
        { moduleName: 'mod2', molecules: [] }
      ];

      const found = findMolecule('src/shared.js', modules);
      
      expect(found).toBe(molecule);
    });
  });

  // ============================================================================
  // getAllAtoms
  // ============================================================================
  describe('getAllAtoms', () => {
    it('should get all atoms from module files', () => {
      const module = ModuleBuilder.create('test')
        .withFile('src/test/file1.js')
        .withMolecule('src/test/file1.js', [
          { name: 'func1', isExported: true },
          { name: 'func2' }
        ])
        .withFile('src/test/file2.js')
        .withMolecule('src/test/file2.js', [{ name: 'func3' }])
        .build();

      const atoms = getAllAtoms(module);
      
      expect(atoms).toHaveLength(3);
      expect(atoms.map(a => a.name)).toContain('func1');
      expect(atoms.map(a => a.name)).toContain('func2');
      expect(atoms.map(a => a.name)).toContain('func3');
    });

    it('should add filePath to each atom', () => {
      const module = ModuleBuilder.create('test')
        .withFile('src/test/main.js')
        .withMolecule('src/test/main.js', [{ name: 'main' }])
        .build();

      const atoms = getAllAtoms(module);
      
      expect(atoms[0].filePath).toBe('src/test/main.js');
    });

    it('should return empty array for module without files', () => {
      const module = ModuleBuilder.create('empty').build();
      
      const atoms = getAllAtoms(module);
      
      expect(atoms).toEqual([]);
    });

    it('should handle molecules without atoms', () => {
      const module = {
        moduleName: 'test',
        files: [{ path: 'file.js' }],
        molecules: [{ filePath: 'file.js' }] // No atoms property
      };

      const atoms = getAllAtoms(module);
      
      expect(atoms).toEqual([]);
    });
  });

  // ============================================================================
  // camelToKebab
  // ============================================================================
  describe('camelToKebab', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(camelToKebab('camelCase')).toBe('camel-case');
      expect(camelToKebab('getUserById')).toBe('get-user-by-id');
    });

    it('should handle PascalCase', () => {
      expect(camelToKebab('PascalCase')).toBe('pascal-case');
      expect(camelToKebab('GetUser')).toBe('get-user');
    });

    it('should handle consecutive capitals', () => {
      expect(camelToKebab('getHTMLContent')).toBe('get-html-content');
      expect(camelToKebab('parseXMLData')).toBe('parse-xml-data');
    });

    it('should handle single word', () => {
      expect(camelToKebab('test')).toBe('test');
      expect(camelToKebab('Test')).toBe('test');
    });

    it('should handle empty string', () => {
      expect(camelToKebab('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(camelToKebab(null)).toBe('');
      expect(camelToKebab(undefined)).toBe('');
    });

    it('should handle leading capital', () => {
      expect(camelToKebab('APIRoute')).toBe('api-route');
    });
  });

  // ============================================================================
  // inferModuleFromCall
  // ============================================================================
  describe('inferModuleFromCall', () => {
    it('should infer database module from db. calls', () => {
      expect(inferModuleFromCall('db.query')).toBe('database');
      expect(inferModuleFromCall('db.connect')).toBe('database');
      expect(inferModuleFromCall('db.transaction')).toBe('database');
    });

    it('should infer redis module from redis. calls', () => {
      expect(inferModuleFromCall('redis.get')).toBe('redis');
      expect(inferModuleFromCall('redis.set')).toBe('redis');
    });

    it('should infer cache module from cache. calls', () => {
      expect(inferModuleFromCall('cache.get')).toBe('cache');
      expect(inferModuleFromCall('cache.set')).toBe('cache');
    });

    it('should infer logger module from logger. calls', () => {
      expect(inferModuleFromCall('logger.info')).toBe('logger');
      expect(inferModuleFromCall('logger.error')).toBe('logger');
    });

    it('should infer config module from config. calls', () => {
      expect(inferModuleFromCall('config.get')).toBe('config');
      expect(inferModuleFromCall('config.set')).toBe('config');
    });

    it('should return null for unknown patterns', () => {
      expect(inferModuleFromCall('utils.helper')).toBeNull();
      expect(inferModuleFromCall('randomFunction')).toBeNull();
      expect(inferModuleFromCall('')).toBeNull();
    });

    it('should match only at start of string', () => {
      expect(inferModuleFromCall('mydb.query')).toBeNull();
      expect(inferModuleFromCall('helper.db.query')).toBeNull();
    });
  });

  // ============================================================================
  // getFileName
  // ============================================================================
  describe('getFileName', () => {
    it('should extract file name from path', () => {
      expect(getFileName('/path/to/file.js')).toBe('file.js');
      expect(getFileName('src/utils/helper.js')).toBe('helper.js');
    });

    it('should handle simple file name', () => {
      expect(getFileName('file.js')).toBe('file.js');
    });

    it('should handle path with dots', () => {
      expect(getFileName('/path/file.name.js')).toBe('file.name.js');
    });
  });

  // ============================================================================
  // classifySideEffects
  // ============================================================================
  describe('classifySideEffects', () => {
    it('should classify network side effects', () => {
      const atom = createMockAtom('test', { hasNetworkCalls: true });
      
      const effects = classifySideEffects(atom);
      
      expect(effects).toContain('network');
    });

    it('should classify DOM side effects', () => {
      const atom = createMockAtom('test', { hasDomManipulation: true });
      
      const effects = classifySideEffects(atom);
      
      expect(effects).toContain('dom');
    });

    it('should classify storage side effects', () => {
      const atom = createMockAtom('test', { hasStorageAccess: true });
      
      const effects = classifySideEffects(atom);
      
      expect(effects).toContain('storage');
    });

    it('should classify logging side effects', () => {
      const atom = createMockAtom('test', { hasLogging: true });
      
      const effects = classifySideEffects(atom);
      
      expect(effects).toContain('logging');
    });

    it('should classify multiple side effects', () => {
      const atom = createMockAtom('test', {
        hasNetworkCalls: true,
        hasStorageAccess: true,
        hasLogging: true
      });
      
      const effects = classifySideEffects(atom);
      
      expect(effects).toHaveLength(3);
      expect(effects).toContain('network');
      expect(effects).toContain('storage');
      expect(effects).toContain('logging');
    });

    it('should return empty array for pure function', () => {
      const atom = createMockAtom('test');
      
      const effects = classifySideEffects(atom);
      
      expect(effects).toEqual([]);
    });
  });

  // ============================================================================
  // aggregateSideEffects
  // ============================================================================
  describe('aggregateSideEffects', () => {
    it('should aggregate side effects from steps', () => {
      const steps = [
        { module: 'mod1', function: 'func1', sideEffects: ['network'] },
        { module: 'mod2', function: 'func2', sideEffects: ['storage'] }
      ];

      const aggregated = aggregateSideEffects(steps);
      
      expect(aggregated).toHaveLength(2);
      expect(aggregated.map(e => e.type)).toContain('network');
      expect(aggregated.map(e => e.type)).toContain('storage');
    });

    it('should deduplicate side effects', () => {
      const steps = [
        { module: 'mod1', function: 'func1', sideEffects: ['network'] },
        { module: 'mod2', function: 'func2', sideEffects: ['network'] }
      ];

      const aggregated = aggregateSideEffects(steps);
      
      expect(aggregated).toHaveLength(1);
      expect(aggregated[0].type).toBe('network');
    });

    it('should track which steps have each side effect', () => {
      const steps = [
        { module: 'mod1', function: 'func1', sideEffects: ['network'] },
        { module: 'mod2', function: 'func2', sideEffects: ['network'] }
      ];

      const aggregated = aggregateSideEffects(steps);
      
      expect(aggregated[0].steps).toHaveLength(2);
      expect(aggregated[0].steps[0]).toEqual({ module: 'mod1', function: 'func1' });
    });

    it('should handle steps without side effects', () => {
      const steps = [
        { module: 'mod1', function: 'func1', sideEffects: ['network'] },
        { module: 'mod2', function: 'func2' },
        { module: 'mod3', function: 'func3', sideEffects: [] }
      ];

      const aggregated = aggregateSideEffects(steps);
      
      expect(aggregated).toHaveLength(1);
      expect(aggregated[0].steps).toHaveLength(1);
    });

    it('should return empty array for empty steps', () => {
      const aggregated = aggregateSideEffects([]);
      
      expect(aggregated).toEqual([]);
    });

    it('should handle all steps having no side effects', () => {
      const steps = [
        { module: 'mod1', function: 'func1' },
        { module: 'mod2', function: 'func2' }
      ];

      const aggregated = aggregateSideEffects(steps);
      
      expect(aggregated).toEqual([]);
    });
  });
});
