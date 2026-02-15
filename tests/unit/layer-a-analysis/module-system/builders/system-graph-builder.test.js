/**
 * @fileoverview System Graph Builder Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/builders/system-graph-builder
 */

import { describe, it, expect } from 'vitest';
import { 
  buildSystemGraph,
  mapModuleConnections 
} from '../../../../../src/layer-a-static/module-system/builders/system-graph-builder.js';
import { 
  ModuleBuilder,
  DependencyBuilder,
  TestScenarios 
} from '../../../../factories/module-system-test.factory.js';

describe('System Graph Builder', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export buildSystemGraph function', () => {
      expect(typeof buildSystemGraph).toBe('function');
    });

    it('should export mapModuleConnections function', () => {
      expect(typeof mapModuleConnections).toBe('function');
    });
  });

  // ============================================================================
  // buildSystemGraph
  // ============================================================================
  describe('buildSystemGraph', () => {
    it('should return graph with nodes and edges', () => {
      const result = buildSystemGraph([], []);
      
      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(Array.isArray(result.nodes)).toBe(true);
      expect(Array.isArray(result.edges)).toBe(true);
    });

    it('should create node for each module', () => {
      const modules = [
        ModuleBuilder.create('auth').build(),
        ModuleBuilder.create('users').build()
      ];

      const graph = buildSystemGraph(modules, []);
      
      expect(graph.nodes).toHaveLength(2);
    });

    it('should include module name as node id', () => {
      const modules = [ModuleBuilder.create('auth').build()];

      const graph = buildSystemGraph(modules, []);
      
      expect(graph.nodes[0].id).toBe('auth');
    });

    it('should set node type to module', () => {
      const modules = [ModuleBuilder.create('auth').build()];

      const graph = buildSystemGraph(modules, []);
      
      expect(graph.nodes[0].type).toBe('module');
    });

    it('should include module metrics in node', () => {
      const modules = [
        ModuleBuilder.create('auth')
          .withMetrics({ totalFunctions: 5, complexity: 3 })
          .build()
      ];

      const graph = buildSystemGraph(modules, []);
      
      expect(graph.nodes[0].metrics).toBeDefined();
    });

    it('should include export count in node', () => {
      const modules = [
        ModuleBuilder.create('auth')
          .withExport('login')
          .withExport('logout')
          .build()
      ];

      const graph = buildSystemGraph(modules, []);
      
      expect(graph.nodes[0].exports).toBe(2);
    });

    it('should have zero exports for module without exports', () => {
      const modules = [ModuleBuilder.create('auth').build()];

      const graph = buildSystemGraph(modules, []);
      
      expect(graph.nodes[0].exports).toBe(0);
    });

    it('should create edges from connections', () => {
      const modules = [
        ModuleBuilder.create('users').build(),
        ModuleBuilder.create('auth').build()
      ];
      const connections = [
        { from: 'users', to: 'auth', type: 'dependency', strength: 'strong', dataFlow: {} }
      ];

      const graph = buildSystemGraph(modules, connections);
      
      expect(graph.edges).toHaveLength(1);
    });

    it('should include edge properties', () => {
      const modules = [
        ModuleBuilder.create('users').build(),
        ModuleBuilder.create('auth').build()
      ];
      const connections = [
        { 
          from: 'users', 
          to: 'auth', 
          type: 'dependency', 
          strength: 'strong',
          dataFlow: { imports: ['validate'] }
        }
      ];

      const graph = buildSystemGraph(modules, connections);
      
      expect(graph.edges[0]).toHaveProperty('from', 'users');
      expect(graph.edges[0]).toHaveProperty('to', 'auth');
      expect(graph.edges[0]).toHaveProperty('type', 'dependency');
      expect(graph.edges[0]).toHaveProperty('strength', 'strong');
      expect(graph.edges[0]).toHaveProperty('dataFlow');
    });

    it('should handle empty modules', () => {
      const graph = buildSystemGraph([], []);
      
      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
    });

    it('should handle modules without connections', () => {
      const modules = [
        ModuleBuilder.create('auth').build(),
        ModuleBuilder.create('users').build()
      ];

      const graph = buildSystemGraph(modules, []);
      
      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges).toHaveLength(0);
    });
  });

  // ============================================================================
  // mapModuleConnections
  // ============================================================================
  describe('mapModuleConnections', () => {
    it('should return array of connections', () => {
      const result = mapModuleConnections([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should detect dependency from imports', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withImport('auth', ['validateToken'])
          .build(),
        ModuleBuilder.create('auth').build()
      ];

      const connections = mapModuleConnections(modules);
      
      expect(connections.length).toBeGreaterThan(0);
    });

    it('should set correct from/to modules', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withImport('auth', ['validate'])
          .build(),
        ModuleBuilder.create('auth').build()
      ];

      const connections = mapModuleConnections(modules);
      
      if (connections.length > 0) {
        expect(connections[0].from).toBe('users');
        expect(connections[0].to).toBe('auth');
      }
    });

    it('should set type to dependency', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withImport('auth', ['validate'])
          .build(),
        ModuleBuilder.create('auth').build()
      ];

      const connections = mapModuleConnections(modules);
      
      if (connections.length > 0) {
        expect(connections[0].type).toBe('dependency');
      }
    });

    it('should include data flow information', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withImport('auth', ['validate', 'login'])
          .build(),
        ModuleBuilder.create('auth').build()
      ];

      const connections = mapModuleConnections(modules);
      
      if (connections.length > 0) {
        expect(connections[0].dataFlow).toHaveProperty('imports');
        expect(connections[0].dataFlow).toHaveProperty('count');
      }
    });

    it('should calculate connection strength', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withImport('auth', ['validate', 'login', 'logout'])
          .withMetrics({ totalFunctions: 5 })
          .build(),
        ModuleBuilder.create('auth').build()
      ];

      const connections = mapModuleConnections(modules);
      
      if (connections.length > 0) {
        expect(connections[0]).toHaveProperty('strength');
        expect(['strong', 'medium', 'weak']).toContain(connections[0].strength);
      }
    });

    it('should not create self-connections', () => {
      const modules = [
        ModuleBuilder.create('users').build()
      ];

      const connections = mapModuleConnections(modules);
      
      const selfConnections = connections.filter(c => c.from === c.to);
      expect(selfConnections).toHaveLength(0);
    });

    it('should detect multiple dependencies', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withImport('auth', ['validate'])
          .withImport('db', ['query'])
          .withImport('cache', ['get'])
          .build(),
        ModuleBuilder.create('auth').build(),
        ModuleBuilder.create('db').build(),
        ModuleBuilder.create('cache').build()
      ];

      const connections = mapModuleConnections(modules);
      
      expect(connections.length).toBeGreaterThanOrEqual(2);
    });

    it('should not create connections for modules without imports', () => {
      const modules = [
        ModuleBuilder.create('auth').build(),
        ModuleBuilder.create('users').build()
      ];

      const connections = mapModuleConnections(modules);
      
      expect(connections).toHaveLength(0);
    });

    it('should handle empty imports array', () => {
      const modules = [
        { moduleName: 'users', imports: [] },
        { moduleName: 'auth', imports: [] }
      ];

      const connections = mapModuleConnections(modules);
      
      expect(connections).toHaveLength(0);
    });

    it('should handle missing imports property', () => {
      const modules = [
        { moduleName: 'users' },
        { moduleName: 'auth' }
      ];

      const connections = mapModuleConnections(modules);
      
      expect(connections).toHaveLength(0);
    });
  });

  // ============================================================================
  // Integration
  // ============================================================================
  describe('Integration', () => {
    it('should build complete graph with connections', () => {
      const scenario = TestScenarios.withDependencies();
      const connections = mapModuleConnections(scenario.modules);
      const graph = buildSystemGraph(scenario.modules, connections);
      
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.nodes[0]).toHaveProperty('id');
      expect(graph.nodes[0]).toHaveProperty('type', 'module');
    });

    it('should handle complex module relationships', () => {
      const modules = [
        ModuleBuilder.create('api')
          .withImport('services', ['getUser', 'createUser'])
          .withImport('auth', ['validate'])
          .build(),
        ModuleBuilder.create('services')
          .withImport('db', ['query'])
          .build(),
        ModuleBuilder.create('auth').build(),
        ModuleBuilder.create('db').build()
      ];

      const connections = mapModuleConnections(modules);
      const graph = buildSystemGraph(modules, connections);
      
      expect(graph.nodes).toHaveLength(4);
      expect(graph.edges.length).toBeGreaterThanOrEqual(2);
    });
  });
});
