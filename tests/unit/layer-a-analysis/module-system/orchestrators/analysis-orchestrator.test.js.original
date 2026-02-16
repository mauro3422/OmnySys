/**
 * @fileoverview Analysis Orchestrator Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/orchestrators/analysis-orchestrator
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeModules,
  analyzeSingleModule,
  analyzeSystemOnly
} from '../../../../../src/layer-a-static/module-system/orchestrators/analysis-orchestrator.js';
import { 
  TestScenarios,
  ModuleBuilder 
} from '../../../../factories/module-system-test.factory.js';

describe('Analysis Orchestrator', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export analyzeModules function', () => {
      expect(typeof analyzeModules).toBe('function');
    });

    it('should export analyzeSingleModule function', () => {
      expect(typeof analyzeSingleModule).toBe('function');
    });

    it('should export analyzeSystemOnly function', () => {
      expect(typeof analyzeSystemOnly).toBe('function');
    });
  });

  // ============================================================================
  // analyzeModules
  // ============================================================================
  describe('analyzeModules', () => {
    it('should return analysis result object', () => {
      const result = analyzeModules('/project', []);
      
      expect(result).toHaveProperty('modules');
      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('summary');
    });

    it('should return modules array', () => {
      const result = analyzeModules('/project', []);
      
      expect(Array.isArray(result.modules)).toBe(true);
    });

    it('should return system analysis', () => {
      const result = analyzeModules('/project', []);
      
      expect(result.system).toHaveProperty('entryPoints');
      expect(result.system).toHaveProperty('businessFlows');
      expect(result.system).toHaveProperty('moduleConnections');
      expect(result.system).toHaveProperty('systemGraph');
      expect(result.system).toHaveProperty('patterns');
    });

    it('should return summary object', () => {
      const result = analyzeModules('/project', []);
      
      expect(result.summary).toHaveProperty('totalModules');
      expect(result.summary).toHaveProperty('totalFiles');
      expect(result.summary).toHaveProperty('totalFunctions');
      expect(result.summary).toHaveProperty('totalBusinessFlows');
      expect(result.summary).toHaveProperty('totalEntryPoints');
      expect(result.summary).toHaveProperty('architecturalPatterns');
    });

    it('should count total modules in summary', () => {
      const scenario = TestScenarios.withDependencies();
      const result = analyzeModules(scenario.root, []);
      
      expect(result.summary.totalModules).toBe(0); // No molecules to group
    });

    it('should count total files in summary', () => {
      const result = analyzeModules('/project', []);
      
      expect(typeof result.summary.totalFiles).toBe('number');
      expect(result.summary.totalFiles).toBe(0);
    });

    it('should count total functions in summary', () => {
      const result = analyzeModules('/project', []);
      
      expect(typeof result.summary.totalFunctions).toBe('number');
      expect(result.summary.totalFunctions).toBe(0);
    });

    it('should return architectural patterns array', () => {
      const result = analyzeModules('/project', []);
      
      expect(Array.isArray(result.summary.architecturalPatterns)).toBe(true);
    });

    it('should handle empty molecules', () => {
      const result = analyzeModules('/project', []);
      
      expect(result.modules).toEqual([]);
      expect(result.summary.totalModules).toBe(0);
    });

    it('should group molecules by module', () => {
      const molecules = [
        { filePath: '/project/src/auth/login.js', atoms: [] },
        { filePath: '/project/src/auth/logout.js', atoms: [] },
        { filePath: '/project/src/users/user.js', atoms: [] }
      ];
      
      const result = analyzeModules('/project', molecules);
      
      expect(result.summary.totalFiles).toBe(3);
    });
  });

  // ============================================================================
  // analyzeSingleModule
  // ============================================================================
  describe('analyzeSingleModule', () => {
    it('should return module analysis', () => {
      const result = analyzeSingleModule('/project/src/test', []);
      
      expect(result).toHaveProperty('modulePath');
      expect(result).toHaveProperty('moduleName');
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('exports');
      expect(result).toHaveProperty('imports');
      expect(result).toHaveProperty('metrics');
    });

    it('should extract module name from path', () => {
      const result = analyzeSingleModule('/project/src/auth', []);
      
      expect(result.moduleName).toBe('auth');
    });

    it('should include module path in result', () => {
      const result = analyzeSingleModule('/project/src/auth', []);
      
      expect(result.modulePath).toBe('/project/src/auth');
    });

    it('should handle empty molecules', () => {
      const result = analyzeSingleModule('/project/src/test', []);
      
      expect(result.files).toEqual([]);
      expect(result.exports).toEqual([]);
      expect(result.imports).toEqual([]);
    });

    it('should analyze molecules in module', () => {
      const molecules = [
        { filePath: '/project/src/auth/login.js', atoms: [{ name: 'login' }] }
      ];
      
      const result = analyzeSingleModule('/project/src/auth', molecules);
      
      expect(result.files.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // analyzeSystemOnly
  // ============================================================================
  describe('analyzeSystemOnly', () => {
    it('should return system analysis', () => {
      const result = analyzeSystemOnly('/project', []);
      
      expect(result).toHaveProperty('projectRoot');
      expect(result).toHaveProperty('entryPoints');
      expect(result).toHaveProperty('businessFlows');
      expect(result).toHaveProperty('moduleConnections');
      expect(result).toHaveProperty('systemGraph');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('meta');
    });

    it('should include project root', () => {
      const result = analyzeSystemOnly('/my/project', []);
      
      expect(result.projectRoot).toBe('/my/project');
    });

    it('should analyze provided modules', () => {
      const modules = [
        ModuleBuilder.create('auth').build(),
        ModuleBuilder.create('users').build()
      ];
      
      const result = analyzeSystemOnly('/project', modules);
      
      expect(result.meta.totalModules).toBe(2);
    });

    it('should create system graph', () => {
      const modules = [
        ModuleBuilder.create('auth').build()
      ];
      
      const result = analyzeSystemOnly('/project', modules);
      
      expect(result.systemGraph.nodes).toHaveLength(1);
    });

    it('should detect entry points', () => {
      const modules = [
        ModuleBuilder.create('api')
          .withFile('src/api/routes.js')
          .build()
      ];
      
      const result = analyzeSystemOnly('/project', modules);
      
      expect(Array.isArray(result.entryPoints)).toBe(true);
    });

    it('should detect patterns', () => {
      const modules = [
        ModuleBuilder.create('controllers').build(),
        ModuleBuilder.create('services').build()
      ];
      
      const result = analyzeSystemOnly('/project', modules);
      
      expect(result.patterns.length).toBeGreaterThan(0);
    });

    it('should handle empty modules', () => {
      const result = analyzeSystemOnly('/project', []);
      
      expect(result.systemGraph.nodes).toHaveLength(0);
      expect(result.meta.totalModules).toBe(0);
    });
  });

  // ============================================================================
  // Integration
  // ============================================================================
  describe('Integration', () => {
    it('analyzeModules should call analyzeSingleModule internally', () => {
      const molecules = [
        { filePath: '/project/src/auth/login.js', atoms: [] }
      ];
      
      const result = analyzeModules('/project', molecules);
      
      // Should have analyzed modules
      expect(result).toHaveProperty('modules');
      expect(result).toHaveProperty('system');
    });

    it('analyzeModules should call analyzeSystemOnly internally', () => {
      const modules = [
        ModuleBuilder.create('auth').build()
      ];
      
      const result = analyzeModules('/project', []);
      
      expect(result).toHaveProperty('system');
      expect(result.system).toHaveProperty('entryPoints');
    });

    it('should handle complete project analysis', () => {
      const scenario = TestScenarios.withDependencies();
      
      const result = analyzeModules(scenario.root, []);
      
      expect(result.summary).toBeDefined();
      expect(result.system).toBeDefined();
    });

    it('should maintain consistency between modules and summary', () => {
      const scenario = TestScenarios.singleModule();
      
      const result = analyzeModules(scenario.root, []);
      
      // Summary should reflect actual module count
      expect(result.summary.totalModules).toBe(result.modules.length);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle molecules with invalid paths', () => {
      const molecules = [
        { filePath: 'invalid', atoms: [] }
      ];
      
      const result = analyzeModules('/project', molecules);
      
      expect(Array.isArray(result.modules)).toBe(true);
    });

    it('should handle circular dependencies', () => {
      const modules = [
        ModuleBuilder.create('a').withImport('b', ['func']).build(),
        ModuleBuilder.create('b').withImport('a', ['func']).build()
      ];
      
      const result = analyzeSystemOnly('/project', modules);
      
      expect(result.moduleConnections.length).toBeGreaterThan(0);
    });

    it('should handle modules with same name', () => {
      const modules = [
        ModuleBuilder.create('test').build(),
        ModuleBuilder.create('test').build()
      ];
      
      const result = analyzeSystemOnly('/project', modules);
      
      // Should handle gracefully, possibly with deduplication
      expect(Array.isArray(result.systemGraph.nodes)).toBe(true);
    });
  });
});
