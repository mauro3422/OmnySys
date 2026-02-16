/**
 * @fileoverview Module Analyzer Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/module-analyzer
 */

import { describe, it, expect } from 'vitest';
import { ModuleAnalyzer } from '../../../../src/layer-a-static/module-system/module-analyzer.js';

describe('Module Analyzer (Legacy Export)', () => {
  describe('Structure Contract', () => {
    it('should export ModuleAnalyzer class', () => {
      expect(ModuleAnalyzer).toBeDefined();
      expect(typeof ModuleAnalyzer).toBe('function');
    });

    it('should be a constructor', () => {
      const analyzer = new ModuleAnalyzer('/project/src/test', []);
      expect(analyzer).toBeInstanceOf(ModuleAnalyzer);
    });

    it('should have analyze method', () => {
      const analyzer = new ModuleAnalyzer('/project/src/test', []);
      expect(typeof analyzer.analyze).toBe('function');
    });
  });

  describe('Module Analysis', () => {
    it('should extract module name from path', () => {
      const analyzer = new ModuleAnalyzer('/project/src/auth', []);
      expect(analyzer.moduleName).toBe('auth');
    });

    it('should handle nested paths', () => {
      const analyzer = new ModuleAnalyzer('/project/src/features/auth', []);
      expect(analyzer.moduleName).toBe('auth');
    });

    it('should filter molecules by path', () => {
      const molecules = [
        { filePath: '/project/src/auth/login.js', atoms: [] },
        { filePath: '/project/src/users/user.js', atoms: [] },
        { filePath: '/project/src/auth/logout.js', atoms: [] }
      ];
      
      const analyzer = new ModuleAnalyzer('/project/src/auth', molecules);
      
      expect(analyzer.molecules).toHaveLength(2);
      expect(analyzer.molecules.map(m => m.filePath)).toContain('/project/src/auth/login.js');
      expect(analyzer.molecules.map(m => m.filePath)).toContain('/project/src/auth/logout.js');
    });

    it('should filter molecules by module name in path', () => {
      const molecules = [
        { filePath: '/other/auth/login.js', atoms: [] },
        { filePath: '/other/users/user.js', atoms: [] }
      ];
      
      const analyzer = new ModuleAnalyzer('/project/src/auth', molecules);
      
      expect(analyzer.molecules).toHaveLength(1);
      expect(analyzer.molecules[0].filePath).toBe('/other/auth/login.js');
    });
  });

  describe('Analysis Result Structure', () => {
    it('should return analysis result with all required fields', () => {
      const analyzer = new ModuleAnalyzer('/project/src/test', []);
      const result = analyzer.analyze();

      expect(result).toHaveProperty('modulePath');
      expect(result).toHaveProperty('moduleName');
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('crossFileConnections');
      expect(result).toHaveProperty('exports');
      expect(result).toHaveProperty('imports');
      expect(result).toHaveProperty('internalChains');
      expect(result).toHaveProperty('metrics');
    });

    it('should include correct module path in result', () => {
      const analyzer = new ModuleAnalyzer('/project/src/auth', []);
      const result = analyzer.analyze();

      expect(result.modulePath).toBe('/project/src/auth');
    });

    it('should include correct module name in result', () => {
      const analyzer = new ModuleAnalyzer('/project/src/auth', []);
      const result = analyzer.analyze();

      expect(result.moduleName).toBe('auth');
    });
  });

  describe('Empty Module Analysis', () => {
    it('should handle empty molecules array', () => {
      const analyzer = new ModuleAnalyzer('/project/src/empty', []);
      const result = analyzer.analyze();

      expect(result.files).toEqual([]);
      expect(result.exports).toEqual([]);
      expect(result.imports).toEqual([]);
    });

    it('should return zero metrics for empty module', () => {
      const analyzer = new ModuleAnalyzer('/project/src/empty', []);
      const result = analyzer.analyze();

      expect(result.metrics.totalFunctions).toBe(0);
      expect(result.metrics.totalFiles).toBe(0);
    });
  });

  describe('File Analysis', () => {
    it('should extract file info from molecules', () => {
      const molecules = [
        {
          filePath: '/project/src/auth/login.js',
          atomCount: 2,
          atoms: [
            { name: 'login', isExported: true },
            { name: 'validate', isExported: false }
          ]
        }
      ];
      
      const analyzer = new ModuleAnalyzer('/project/src/auth', molecules);
      const result = analyzer.analyze();

      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('/project/src/auth/login.js');
      expect(result.files[0].atomCount).toBe(2);
    });

    it('should track exports per file', () => {
      const molecules = [
        {
          filePath: '/project/src/auth/index.js',
          atoms: [
            { name: 'authenticate', isExported: true },
            { name: 'logout', isExported: true },
            { name: 'helper', isExported: false }
          ]
        }
      ];
      
      const analyzer = new ModuleAnalyzer('/project/src/auth', molecules);
      const result = analyzer.analyze();

      expect(result.files[0].exports).toEqual(['authenticate', 'logout']);
    });

    it('should detect side effects in files', () => {
      const molecules = [
        {
          filePath: '/project/src/auth/init.js',
          atoms: [
            { name: 'init', hasSideEffects: true }
          ]
        },
        {
          filePath: '/project/src/auth/pure.js',
          atoms: [
            { name: 'helper', hasSideEffects: false }
          ]
        }
      ];
      
      const analyzer = new ModuleAnalyzer('/project/src/auth', molecules);
      const result = analyzer.analyze();

      expect(result.files[0].hasSideEffects).toBe(true);
      expect(result.files[1].hasSideEffects).toBe(false);
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate total functions', () => {
      const molecules = [
        { filePath: '/project/src/auth/file1.js', atoms: [{}, {}] },
        { filePath: '/project/src/auth/file2.js', atoms: [{}, {}, {}] }
      ];
      
      const analyzer = new ModuleAnalyzer('/project/src/auth', molecules);
      const result = analyzer.analyze();

      expect(result.metrics.totalFunctions).toBe(5);
    });

    it('should calculate total files', () => {
      const molecules = [
        { filePath: '/project/src/auth/file1.js', atoms: [] },
        { filePath: '/project/src/auth/file2.js', atoms: [] },
        { filePath: '/project/src/auth/file3.js', atoms: [] }
      ];
      
      const analyzer = new ModuleAnalyzer('/project/src/auth', molecules);
      const result = analyzer.analyze();

      expect(result.metrics.totalFiles).toBe(3);
    });
  });

  describe('Export Analysis', () => {
    it('should collect all exports from module', () => {
      const molecules = [
        {
          filePath: '/project/src/auth/index.js',
          atoms: [
            { name: 'login', isExported: true },
            { name: 'logout', isExported: true }
          ]
        },
        {
          filePath: '/project/src/auth/utils.js',
          atoms: [
            { name: 'helper', isExported: true }
          ]
        }
      ];
      
      const analyzer = new ModuleAnalyzer('/project/src/auth', molecules);
      const result = analyzer.analyze();

      expect(result.exports.length).toBeGreaterThan(0);
    });
  });

  describe('Internal Chains', () => {
    it('should build internal call chains', () => {
      const molecules = [
        {
          filePath: '/project/src/auth/login.js',
          atoms: [
            { name: 'login', calls: [{ name: 'validate', type: 'internal' }] },
            { name: 'validate', calls: [] }
          ]
        }
      ];
      
      const analyzer = new ModuleAnalyzer('/project/src/auth', molecules);
      const result = analyzer.analyze();

      expect(result.internalChains).toBeDefined();
    });
  });
});
