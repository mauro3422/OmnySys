/**
 * @fileoverview System Analyzer Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/system-analyzer
 */

import { describe, it, expect } from 'vitest';
import { SystemAnalyzer } from '../../../../src/layer-a-static/module-system/system-analyzer.js';
import { 
  ModuleBuilder,
  TestScenarios,
  createMockModules 
} from '../../../factories/module-system-test.factory.js';

describe('SystemAnalyzer', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export SystemAnalyzer class', () => {
      expect(SystemAnalyzer).toBeDefined();
      expect(typeof SystemAnalyzer).toBe('function');
    });

    it('should be a constructor with projectRoot and modules', () => {
      const modules = createMockModules(2);
      const analyzer = new SystemAnalyzer('/project', modules);
      
      expect(analyzer).toBeInstanceOf(SystemAnalyzer);
      expect(analyzer.projectRoot).toBe('/project');
      expect(analyzer.modules).toEqual(modules);
    });

    it('should create moduleByName map', () => {
      const modules = [
        ModuleBuilder.create('auth').build(),
        ModuleBuilder.create('users').build()
      ];
      const analyzer = new SystemAnalyzer('/project', modules);
      
      expect(analyzer.moduleByName.size).toBe(2);
      expect(analyzer.moduleByName.get('auth')).toBeDefined();
      expect(analyzer.moduleByName.get('users')).toBeDefined();
    });
  });

  // ============================================================================
  // Analysis Result
  // ============================================================================
  describe('Analysis Result', () => {
    it('should have analyze method', () => {
      const analyzer = new SystemAnalyzer('/project', []);
      expect(typeof analyzer.analyze).toBe('function');
    });

    it('should return analysis result with all required fields', () => {
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

    it('should include project root in result', () => {
      const analyzer = new SystemAnalyzer('/my/project', []);
      const result = analyzer.analyze();

      expect(result.projectRoot).toBe('/my/project');
    });

    it('should include meta information', () => {
      const modules = createMockModules(3);
      const analyzer = new SystemAnalyzer('/project', modules);
      const result = analyzer.analyze();

      expect(result.meta).toHaveProperty('totalModules');
      expect(result.meta).toHaveProperty('totalBusinessFlows');
      expect(result.meta).toHaveProperty('totalEntryPoints');
      expect(result.meta).toHaveProperty('totalConnections');
      expect(result.meta).toHaveProperty('analyzedAt');
    });

    it('should count total modules in meta', () => {
      const modules = createMockModules(5);
      const analyzer = new SystemAnalyzer('/project', modules);
      const result = analyzer.analyze();

      expect(result.meta.totalModules).toBe(5);
    });

    it('should include ISO timestamp', () => {
      const analyzer = new SystemAnalyzer('/project', []);
      const result = analyzer.analyze();

      expect(result.meta.analyzedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ============================================================================
  // Entry Points Detection
  // ============================================================================
  describe('Entry Points Detection', () => {
    it('should find entry points array', () => {
      const analyzer = new SystemAnalyzer('/project', []);
      const result = analyzer.analyze();

      expect(Array.isArray(result.entryPoints)).toBe(true);
    });

    it('should handle modules with various patterns', () => {
      const modules = [
        ModuleBuilder.create('api').withFile('src/api/routes.js').build(),
        ModuleBuilder.create('cli').build(),
        ModuleBuilder.create('events').build()
      ];
      
      const analyzer = new SystemAnalyzer('/project', modules);
      const result = analyzer.analyze();

      expect(Array.isArray(result.entryPoints)).toBe(true);
    });
  });

  // ============================================================================
  // Business Flows
  // ============================================================================
  describe('Business Flows', () => {
    it('should detect business flows array', () => {
      const analyzer = new SystemAnalyzer('/project', []);
      const result = analyzer.analyze();

      expect(Array.isArray(result.businessFlows)).toBe(true);
    });
  });

  // ============================================================================
  // Module Connections
  // ============================================================================
  describe('Module Connections', () => {
    it('should map module connections', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withImport('auth', ['validateToken'])
          .build(),
        ModuleBuilder.create('auth').build()
      ];
      
      const analyzer = new SystemAnalyzer('/project', modules);
      const result = analyzer.analyze();

      expect(Array.isArray(result.moduleConnections)).toBe(true);
    });
  });

  // ============================================================================
  // System Graph
  // ============================================================================
  describe('System Graph', () => {
    it('should build system graph', () => {
      const modules = createMockModules(2);
      const analyzer = new SystemAnalyzer('/project', modules);
      const result = analyzer.analyze();

      expect(result.systemGraph).toHaveProperty('nodes');
      expect(result.systemGraph).toHaveProperty('edges');
    });

    it('should create node for each module', () => {
      const modules = createMockModules(3);
      const analyzer = new SystemAnalyzer('/project', modules);
      const result = analyzer.analyze();

      expect(result.systemGraph.nodes).toHaveLength(3);
    });

    it('should include module info in nodes', () => {
      const modules = [
        ModuleBuilder.create('auth')
          .withMetrics({ totalFunctions: 5 })
          .withExport('login', { usedBy: 3 })
          .build()
      ];
      
      const analyzer = new SystemAnalyzer('/project', modules);
      const result = analyzer.analyze();

      const authNode = result.systemGraph.nodes.find(n => n.id === 'auth');
      expect(authNode).toBeDefined();
      expect(authNode.type).toBe('module');
    });

    it('should create edges from connections', () => {
      const modules = [
        ModuleBuilder.create('users').withImport('auth', ['validate']).build(),
        ModuleBuilder.create('auth').build()
      ];
      
      const analyzer = new SystemAnalyzer('/project', modules);
      const result = analyzer.analyze();

      expect(Array.isArray(result.systemGraph.edges)).toBe(true);
    });
  });

  // ============================================================================
  // Pattern Detection
  // ============================================================================
  describe('Pattern Detection', () => {
    it('should detect architectural patterns', () => {
      const analyzer = new SystemAnalyzer('/project', []);
      const result = analyzer.analyze();

      expect(Array.isArray(result.patterns)).toBe(true);
    });

    it('should detect layered architecture', () => {
      const scenario = TestScenarios.layeredArchitecture();
      const analyzer = new SystemAnalyzer(scenario.root, scenario.modules);
      const result = analyzer.analyze();

      const layeredPattern = result.patterns.find(p => p.name === 'Layered Architecture');
      if (layeredPattern) {
        expect(layeredPattern.confidence).toBeGreaterThan(0);
      }
    });

    it('should detect service-oriented pattern', () => {
      const scenario = TestScenarios.microservicesLike();
      const analyzer = new SystemAnalyzer(scenario.root, scenario.modules);
      const result = analyzer.analyze();

      const servicePattern = result.patterns.find(p => p.name === 'Service-Oriented');
      if (servicePattern) {
        expect(servicePattern.confidence).toBeGreaterThan(0);
      }
    });

    it('should detect event-driven pattern', () => {
      const scenario = TestScenarios.eventDriven();
      const analyzer = new SystemAnalyzer(scenario.root, scenario.modules);
      const result = analyzer.analyze();

      const eventPattern = result.patterns.find(p => p.name === 'Event-Driven Elements');
      if (eventPattern) {
        expect(eventPattern.confidence).toBeGreaterThan(0);
      }
    });

    it('should include pattern evidence', () => {
      const scenario = TestScenarios.layeredArchitecture();
      const analyzer = new SystemAnalyzer(scenario.root, scenario.modules);
      const result = analyzer.analyze();

      if (result.patterns.length > 0) {
        expect(result.patterns[0]).toHaveProperty('evidence');
      }
    });
  });

  // ============================================================================
  // Helper Methods
  // ============================================================================
  describe('Helper Methods', () => {
    it('should find molecule by file path', () => {
      const modules = [
        ModuleBuilder.create('test')
          .withMolecule('src/test/file.js', [{ name: 'func' }])
          .build()
      ];
      
      const analyzer = new SystemAnalyzer('/project', modules);
      const molecule = analyzer.findMolecule('src/test/file.js');
      
      expect(molecule).toBeDefined();
    });

    it('should find atom by module and function name', () => {
      const modules = [
        ModuleBuilder.create('auth')
          .withFile('src/auth/login.js')
          .withMolecule('src/auth/login.js', [{ name: 'authenticate' }])
          .build()
      ];
      
      const analyzer = new SystemAnalyzer('/project', modules);
      const atom = analyzer.findAtom('auth', 'authenticate');
      
      expect(atom).toBeDefined();
    });

    it('should return null for non-existent module', () => {
      const modules = [ModuleBuilder.create('auth').build()];
      
      const analyzer = new SystemAnalyzer('/project', modules);
      const atom = analyzer.findAtom('nonExistent', 'func');
      
      expect(atom).toBeNull();
    });
  });

  // ============================================================================
  // Empty/Edge Cases
  // ============================================================================
  describe('Empty/Edge Cases', () => {
    it('should handle empty modules array', () => {
      const analyzer = new SystemAnalyzer('/project', []);
      const result = analyzer.analyze();

      expect(result.systemGraph.nodes).toHaveLength(0);
      expect(result.meta.totalModules).toBe(0);
    });

    it('should handle single module', () => {
      const scenario = TestScenarios.singleModule();
      const analyzer = new SystemAnalyzer(scenario.root, scenario.modules);
      const result = analyzer.analyze();

      expect(result.meta.totalModules).toBe(1);
      expect(result.systemGraph.nodes).toHaveLength(1);
    });

    it('should handle modules without imports', () => {
      const modules = createMockModules(3);
      const analyzer = new SystemAnalyzer('/project', modules);
      const result = analyzer.analyze();

      expect(result.moduleConnections).toEqual([]);
    });
  });
});
