/**
 * @fileoverview Module System Contract Tests
 * 
 * Tests the contracts between module-system components
 * 
 * @module tests/unit/layer-a-analysis/module-system/module-contract
 */

import { describe, it, expect } from 'vitest';
import { ModuleAnalyzer } from '../../../../src/layer-a-static/module-system/module-analyzer.js';
import { SystemAnalyzer } from '../../../../src/layer-a-static/module-system/system-analyzer.js';
import { 
  analyzeModules,
  analyzeSingleModule,
  analyzeSystemOnly
} from '../../../../src/layer-a-static/module-system/orchestrators/index.js';
import { detectBusinessFlows } from '../../../../src/layer-a-static/module-system/analyzers/business-flow-analyzer.js';
import { detectArchitecturalPatterns } from '../../../../src/layer-a-static/module-system/analyzers/pattern-analyzer.js';
import { 
  buildSystemGraph,
  mapModuleConnections 
} from '../../../../src/layer-a-static/module-system/builders/system-graph-builder.js';
import { 
  TestScenarios,
  ModuleBuilder,
  ProjectBuilder 
} from '../../../factories/module-system-test.factory.js';

describe('Module System Contract', () => {
  // ============================================================================
  // ModuleAnalyzer Contract
  // ============================================================================
  describe('ModuleAnalyzer Contract', () => {
    it('should always return analysis with required fields', () => {
      const analyzer = new ModuleAnalyzer('/project/src/test', []);
      const result = analyzer.analyze();

      // Core fields must exist
      expect(result).toHaveProperty('modulePath');
      expect(result).toHaveProperty('moduleName');
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('crossFileConnections');
      expect(result).toHaveProperty('exports');
      expect(result).toHaveProperty('imports');
      expect(result).toHaveProperty('internalChains');
      expect(result).toHaveProperty('metrics');

      // Types must be correct
      expect(typeof result.modulePath).toBe('string');
      expect(typeof result.moduleName).toBe('string');
      expect(Array.isArray(result.files)).toBe(true);
      expect(Array.isArray(result.crossFileConnections)).toBe(true);
      expect(Array.isArray(result.exports)).toBe(true);
      expect(Array.isArray(result.imports)).toBe(true);
      expect(Array.isArray(result.internalChains)).toBe(true);
      expect(typeof result.metrics).toBe('object');
    });

    it('should extract module name from last path segment', () => {
      const analyzer1 = new ModuleAnalyzer('/a/b/c/module', []);
      const analyzer2 = new ModuleAnalyzer('module', []);

      expect(analyzer1.moduleName).toBe('module');
      expect(analyzer2.moduleName).toBe('module');
    });

    it('should filter molecules by module path or name', () => {
      const molecules = [
        { filePath: '/project/src/auth/login.js', atoms: [] },
        { filePath: '/project/src/users/user.js', atoms: [] },
        { filePath: '/other/auth/test.js', atoms: [] }
      ];
      
      const analyzer = new ModuleAnalyzer('/project/src/auth', molecules);
      
      // Should include molecules from /project/src/auth path
      // or containing /auth/ in path
      expect(analyzer.molecules.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // SystemAnalyzer Contract
  // ============================================================================
  describe('SystemAnalyzer Contract', () => {
    it('should always return complete analysis result', () => {
      const analyzer = new SystemAnalyzer('/project', []);
      const result = analyzer.analyze();

      expect(result).toHaveProperty('projectRoot');
      expect(result).toHaveProperty('entryPoints');
      expect(result).toHaveProperty('businessFlows');
      expect(result).toHaveProperty('moduleConnections');
      expect(result).toHaveProperty('systemGraph');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('meta');
    });

    it('should build moduleByName map correctly', () => {
      const modules = [
        ModuleBuilder.create('auth').build(),
        ModuleBuilder.create('users').build()
      ];
      
      const analyzer = new SystemAnalyzer('/project', modules);
      
      expect(analyzer.moduleByName.get('auth')).toBeDefined();
      expect(analyzer.moduleByName.get('users')).toBeDefined();
    });

    it('should findMolecule return correct molecule or null', () => {
      const module = ModuleBuilder.create('auth')
        .withMolecule('src/auth/login.js', [])
        .build();
      
      const analyzer = new SystemAnalyzer('/project', [module]);
      
      const found = analyzer.findMolecule('src/auth/login.js');
      const notFound = analyzer.findMolecule('unknown.js');
      
      expect(found).toBeDefined();
      expect(notFound).toBeNull();
    });
  });

  // ============================================================================
  // Business Flow Analyzer Contract
  // ============================================================================
  describe('Business Flow Analyzer Contract', () => {
    it('should return array of business flows', () => {
      const result = detectBusinessFlows([], {});
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // Pattern Analyzer Contract
  // ============================================================================
  describe('Pattern Analyzer Contract', () => {
    it('should return array of patterns', () => {
      const result = detectArchitecturalPatterns([]);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('patterns should have required structure', () => {
      const scenario = TestScenarios.layeredArchitecture();
      const result = detectArchitecturalPatterns(scenario.modules);
      
      if (result.length > 0) {
        const pattern = result[0];
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('confidence');
        expect(pattern).toHaveProperty('evidence');
        expect(typeof pattern.name).toBe('string');
        expect(typeof pattern.confidence).toBe('number');
        expect(typeof pattern.evidence).toBe('string');
      }
    });

    it('confidence should be between 0 and 1', () => {
      const scenario = TestScenarios.layeredArchitecture();
      const result = detectArchitecturalPatterns(scenario.modules);
      
      result.forEach(pattern => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  // ============================================================================
  // System Graph Builder Contract
  // ============================================================================
  describe('System Graph Builder Contract', () => {
    it('buildSystemGraph should return nodes and edges', () => {
      const result = buildSystemGraph([], []);
      
      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(Array.isArray(result.nodes)).toBe(true);
      expect(Array.isArray(result.edges)).toBe(true);
    });

    it('nodes should have required structure', () => {
      const modules = [ModuleBuilder.create('test').build()];
      const result = buildSystemGraph(modules, []);
      
      if (result.nodes.length > 0) {
        const node = result.nodes[0];
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('type');
        expect(node.type).toBe('module');
      }
    });

    it('edges should have required structure', () => {
      const modules = [
        ModuleBuilder.create('a').build(),
        ModuleBuilder.create('b').build()
      ];
      const connections = [{ from: 'a', to: 'b', type: 'dependency', strength: 'weak', dataFlow: {} }];
      const result = buildSystemGraph(modules, connections);
      
      if (result.edges.length > 0) {
        const edge = result.edges[0];
        expect(edge).toHaveProperty('from');
        expect(edge).toHaveProperty('to');
        expect(edge).toHaveProperty('type');
        expect(edge).toHaveProperty('strength');
        expect(edge).toHaveProperty('dataFlow');
      }
    });

    it('mapModuleConnections should return array', () => {
      const result = mapModuleConnections([]);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('connections should have required structure', () => {
      const modules = [
        ModuleBuilder.create('users').withImport('auth', ['validate']).build(),
        ModuleBuilder.create('auth').build()
      ];
      
      const result = mapModuleConnections(modules);
      
      if (result.length > 0) {
        const conn = result[0];
        expect(conn).toHaveProperty('from');
        expect(conn).toHaveProperty('to');
        expect(conn).toHaveProperty('type');
        expect(conn).toHaveProperty('strength');
        expect(conn).toHaveProperty('dataFlow');
      }
    });
  });

  // ============================================================================
  // Orchestrator Contract
  // ============================================================================
  describe('Orchestrator Contract', () => {
    it('analyzeModules should return complete result structure', () => {
      const result = analyzeModules('/project', []);
      
      expect(result).toHaveProperty('modules');
      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('summary');
      
      expect(Array.isArray(result.modules)).toBe(true);
      expect(typeof result.system).toBe('object');
      expect(typeof result.summary).toBe('object');
    });

    it('summary should have required fields', () => {
      const result = analyzeModules('/project', []);
      
      expect(result.summary).toHaveProperty('totalModules');
      expect(result.summary).toHaveProperty('totalFiles');
      expect(result.summary).toHaveProperty('totalFunctions');
      expect(result.summary).toHaveProperty('totalBusinessFlows');
      expect(result.summary).toHaveProperty('totalEntryPoints');
      expect(result.summary).toHaveProperty('architecturalPatterns');
    });

    it('analyzeSingleModule should return module structure', () => {
      const result = analyzeSingleModule('/project/src/test', []);
      
      expect(result).toHaveProperty('modulePath');
      expect(result).toHaveProperty('moduleName');
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('exports');
      expect(result).toHaveProperty('imports');
      expect(result).toHaveProperty('metrics');
    });

    it('analyzeSystemOnly should return system structure', () => {
      const result = analyzeSystemOnly('/project', []);
      
      expect(result).toHaveProperty('projectRoot');
      expect(result).toHaveProperty('entryPoints');
      expect(result).toHaveProperty('businessFlows');
      expect(result).toHaveProperty('moduleConnections');
      expect(result).toHaveProperty('systemGraph');
      expect(result).toHaveProperty('patterns');
    });
  });

  // ============================================================================
  // Integration Contract
  // ============================================================================
  describe('Integration Contract', () => {
    it('orchestrator should use detectors correctly', () => {
      const modules = [
        ModuleBuilder.create('api')
          .withFile('src/api/routes.js')
          .build()
      ];
      
      const result = analyzeSystemOnly('/project', modules);
      
      // System analysis should include entry points detected
      expect(Array.isArray(result.entryPoints)).toBe(true);
    });

    it('orchestrator should use analyzers correctly', () => {
      const modules = [
        ModuleBuilder.create('controllers').build(),
        ModuleBuilder.create('services').build()
      ];
      
      const result = analyzeSystemOnly('/project', modules);
      
      // Should detect layered pattern
      expect(result.patterns.length).toBeGreaterThan(0);
    });

    it('orchestrator should use builders correctly', () => {
      const modules = [
        ModuleBuilder.create('a').build(),
        ModuleBuilder.create('b').build()
      ];
      
      const result = analyzeSystemOnly('/project', modules);
      
      expect(result.systemGraph.nodes).toHaveLength(2);
    });

    it('complete analysis pipeline should work end-to-end', () => {
      const scenario = TestScenarios.withDependencies();
      
      const result = analyzeModules(scenario.root, []);
      
      // Full pipeline should produce complete result
      expect(result.modules).toBeDefined();
      expect(result.system).toBeDefined();
      expect(result.summary).toBeDefined();
      
      // All counts should be numbers
      expect(typeof result.summary.totalModules).toBe('number');
      expect(typeof result.summary.totalFiles).toBe('number');
      expect(typeof result.summary.totalFunctions).toBe('number');
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle empty inputs gracefully', () => {
      expect(() => analyzeModules('', [])).not.toThrow();
      expect(() => analyzeSingleModule('', [])).not.toThrow();
      expect(() => analyzeSystemOnly('', [])).not.toThrow();
    });

    it('should always return valid arrays', () => {
      const result = analyzeSystemOnly('/project', []);
      
      expect(Array.isArray(result.entryPoints)).toBe(true);
      expect(Array.isArray(result.businessFlows)).toBe(true);
      expect(Array.isArray(result.moduleConnections)).toBe(true);
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(Array.isArray(result.systemGraph.nodes)).toBe(true);
      expect(Array.isArray(result.systemGraph.edges)).toBe(true);
    });
  });
});
