/**
 * @fileoverview Export Detector Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/detectors/export-detector
 */

import { describe, it, expect } from 'vitest';
import { findMainExports } from '../../../../../src/layer-a-static/module-system/detectors/export-detector.js';
import { ModuleBuilder } from '../../../../factories/module-system-test.factory.js';

describe('Export Detector', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export findMainExports function', () => {
      expect(typeof findMainExports).toBe('function');
    });

    it('should return array', () => {
      const result = findMainExports([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // Main Export Detection
  // ============================================================================
  describe('Main Export Detection', () => {
    it('should find exports from index.js', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/index.js')
          .withExport('helper', { file: 'index.js' })
          .build()
      ];

      const exports = findMainExports(modules);
      
      expect(exports.length).toBeGreaterThan(0);
    });

    it('should find exports from main.js', () => {
      const modules = [
        ModuleBuilder.create('app')
          .withFile('src/app/main.js')
          .withExport('start', { file: 'main.js' })
          .build()
      ];

      const exports = findMainExports(modules);
      
      expect(exports.length).toBeGreaterThan(0);
    });

    it('should find multiple exports from main file', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/index.js')
          .withExport('formatDate', { file: 'index.js' })
          .withExport('parseJSON', { file: 'index.js' })
          .withExport('validate', { file: 'index.js' })
          .build()
      ];

      const exports = findMainExports(modules);
      
      expect(exports.length).toBe(3);
    });

    it('should find exports across multiple modules', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/index.js')
          .withExport('helper', { file: 'index.js' })
          .build(),
        ModuleBuilder.create('config')
          .withFile('src/config/index.js')
          .withExport('getConfig', { file: 'index.js' })
          .build(),
        ModuleBuilder.create('logger')
          .withFile('src/logger/main.js')
          .withExport('log', { file: 'main.js' })
          .build()
      ];

      const exports = findMainExports(modules);
      
      expect(exports.length).toBe(3);
    });
  });

  // ============================================================================
  // Export Structure
  // ============================================================================
  describe('Export Structure', () => {
    it('should have type set to library', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/index.js')
          .withExport('helper', { file: 'index.js' })
          .build()
      ];

      const exports = findMainExports(modules);
      
      if (exports.length > 0) {
        expect(exports[0].type).toBe('library');
      }
    });

    it('should have export name', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/index.js')
          .withExport('formatDate', { file: 'index.js' })
          .build()
      ];

      const exports = findMainExports(modules);
      
      if (exports.length > 0) {
        expect(exports[0]).toHaveProperty('name');
        expect(exports[0].name).toBe('formatDate');
      }
    });

    it('should have module name', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/index.js')
          .withExport('helper', { file: 'index.js' })
          .build()
      ];

      const exports = findMainExports(modules);
      
      if (exports.length > 0) {
        expect(exports[0]).toHaveProperty('module');
        expect(exports[0].module).toBe('utils');
      }
    });

    it('should have exportedFrom file', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/index.js')
          .withExport('helper', { file: 'index.js' })
          .build()
      ];

      const exports = findMainExports(modules);
      
      if (exports.length > 0) {
        expect(exports[0]).toHaveProperty('exportedFrom');
        expect(exports[0].exportedFrom).toBe('index.js');
      }
    });
  });

  // ============================================================================
  // Filtering
  // ============================================================================
  describe('Filtering', () => {
    it('should only include exports from index.js', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/index.js')
          .withFile('src/utils/helper.js')
          .withExport('mainHelper', { file: 'index.js' })
          .withExport('internalHelper', { file: 'helper.js' })
          .build()
      ];

      const exports = findMainExports(modules);
      
      expect(exports.length).toBe(1);
      expect(exports[0].name).toBe('mainHelper');
    });

    it('should only include exports from main.js', () => {
      const modules = [
        ModuleBuilder.create('app')
          .withFile('src/app/main.js')
          .withFile('src/app/utils.js')
          .withExport('start', { file: 'main.js' })
          .withExport('helper', { file: 'utils.js' })
          .build()
      ];

      const exports = findMainExports(modules);
      
      expect(exports.length).toBe(1);
      expect(exports[0].name).toBe('start');
    });

    it('should not include exports from other files', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/helper.js')
          .withExport('helper', { file: 'helper.js' })
          .build()
      ];

      const exports = findMainExports(modules);
      
      expect(exports).toEqual([]);
    });
  });

  // ============================================================================
  // Export Types
  // ============================================================================
  describe('Export Types', () => {
    it('should handle functions', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/index.js')
          .withExport('formatDate', { file: 'index.js', type: 'function' })
          .build()
      ];

      const exports = findMainExports(modules);
      
      expect(exports.length).toBe(1);
      expect(exports[0].name).toBe('formatDate');
    });

    it('should handle classes', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/index.js')
          .withExport('Formatter', { file: 'index.js', type: 'class' })
          .build()
      ];

      const exports = findMainExports(modules);
      
      expect(exports.length).toBe(1);
      expect(exports[0].name).toBe('Formatter');
    });

    it('should handle constants', () => {
      const modules = [
        ModuleBuilder.create('config')
          .withFile('src/config/index.js')
          .withExport('CONFIG', { file: 'index.js', type: 'const' })
          .build()
      ];

      const exports = findMainExports(modules);
      
      expect(exports.length).toBe(1);
      expect(exports[0].name).toBe('CONFIG');
    });
  });

  // ============================================================================
  // Empty/Edge Cases
  // ============================================================================
  describe('Empty/Edge Cases', () => {
    it('should return empty array for empty modules', () => {
      const exports = findMainExports([]);
      expect(exports).toEqual([]);
    });

    it('should return empty array for modules without main file', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/helper.js')
          .withExport('helper', { file: 'helper.js' })
          .build()
      ];

      const exports = findMainExports(modules);
      expect(exports).toEqual([]);
    });

    it('should return empty array for modules without exports', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/index.js')
          .build()
      ];

      const exports = findMainExports(modules);
      expect(exports).toEqual([]);
    });

    it('should handle null exports', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/index.js')
          .build()
      ];
      modules[0].exports = null;

      const exports = findMainExports(modules);
      expect(exports).toEqual([]);
    });

    it('should handle missing exports property', () => {
      const modules = [
        { moduleName: 'utils', files: [{ path: 'src/utils/index.js' }] }
      ];

      const exports = findMainExports(modules);
      expect(exports).toEqual([]);
    });
  });
});
