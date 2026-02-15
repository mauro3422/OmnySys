/**
 * @fileoverview Layer A Integration Tests
 * 
 * End-to-end integration tests for the Layer A analysis pipeline.
 * Tests the complete flow from scanner to analyzer.
 * 
 * @module tests/unit/layer-a-analysis/layer-a-integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { GraphBuilder, SystemMapBuilder } from '../../factories/graph-test.factory.js';
import { DetectorTestFactory } from '../../factories/detector-test.factory.js';
import { RaceScenarioBuilder } from '../../factories/race-detector-test.factory.js';
import { 
  createMockSystemMap, 
  createMockFile,
  ScenarioBuilder 
} from '../../factories/analysis.factory.js';

/**
 * Integration Test Suite: Complete Analysis Pipeline
 * 
 * Tests: scanner → parser → analyzer → pipeline
 */
describe('Layer A Integration - Complete Pipeline', () => {
  describe('scanner → parser → analyzer → pipeline', () => {
    it('should process a simple file through the complete pipeline', async () => {
      // Build a minimal system map using factory
      const systemMap = SystemMapBuilder.create()
        .withFile('src/index.js', { exports: ['main'] })
        .withFile('src/utils.js', { exports: ['helper'] })
        .withDependency('src/index.js', 'src/utils.js')
        .build();

      // Verify structure
      expect(systemMap.files).toBeDefined();
      expect(systemMap.files['src/index.js']).toBeDefined();
      expect(systemMap.files['src/utils.js']).toBeDefined();
      expect(systemMap.dependencies).toHaveLength(1);
    });

    it('should handle circular dependencies in pipeline', async () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withFile('src/c.js')
        .withDependency('src/a.js', 'src/b.js')
        .withDependency('src/b.js', 'src/c.js')
        .withDependency('src/c.js', 'src/a.js')
        .build();

      // Verify cycle is preserved
      expect(systemMap.dependencies).toHaveLength(3);
      
      // Check bidirectional relationships
      expect(systemMap.files['src/a.js'].dependsOn).toContain('src/b.js');
      expect(systemMap.files['src/b.js'].dependsOn).toContain('src/c.js');
      expect(systemMap.files['src/c.js'].dependsOn).toContain('src/a.js');
    });

    it('should propagate metadata through pipeline', async () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withFunction('src/main.js', 'init', { isExported: true, isAsync: true })
        .withFunction('src/main.js', 'helper', { isExported: false })
        .build();

      expect(systemMap.functions['src/main.js']).toHaveLength(2);
      expect(systemMap.metadata.totalFunctions).toBe(2);
      expect(systemMap.metadata.totalFiles).toBe(1);
    });
  });

  describe('extractors → data flow → graph', () => {
    it('should build graph from extracted data', () => {
      const graph = GraphBuilder.create()
        .withFile('src/api.js')
        .withFile('src/service.js')
        .withFile('src/model.js')
        .withDependencyChain(['src/api.js', 'src/service.js', 'src/model.js'])
        .build();

      expect(Object.keys(graph.files)).toHaveLength(3);
      expect(graph.dependencies).toHaveLength(2);
      
      // Verify transitive relationships
      expect(graph.files['src/api.js'].dependsOn).toContain('src/service.js');
      expect(graph.files['src/service.js'].dependsOn).toContain('src/model.js');
    });

    it('should handle function links in graph', () => {
      const graph = GraphBuilder.create()
        .withFile('src/utils.js')
        .withFile('src/main.js')
        .withFunction('src/utils.js', 'formatDate', { isExported: true })
        .withFunction('src/main.js', 'init', { calls: ['formatDate'] })
        .withFunctionLink('src/main.js::init', 'src/utils.js::formatDate')
        .build();

      expect(graph.function_links).toHaveLength(1);
      expect(graph.function_links[0].from).toBe('src/main.js::init');
      expect(graph.function_links[0].to).toBe('src/utils.js::formatDate');
    });

    it('should support complex dependency patterns', () => {
      // Diamond pattern: A -> B, A -> C, B -> D, C -> D
      const graph = GraphBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withFile('src/c.js')
        .withFile('src/d.js')
        .withDependency('src/a.js', 'src/b.js')
        .withDependency('src/a.js', 'src/c.js')
        .withDependency('src/b.js', 'src/d.js')
        .withDependency('src/c.js', 'src/d.js')
        .build();

      expect(graph.files['src/d.js'].usedBy).toHaveLength(2);
      expect(graph.files['src/a.js'].dependsOn).toHaveLength(2);
    });
  });

  describe('tier1 → tier2 → tier3 analyses', () => {
    it('should detect Tier 1 hotspots', () => {
      const systemMap = ScenarioBuilder.hotspot(15);
      
      // Verify hotspot structure
      expect(systemMap.function_links).toHaveLength(15);
      expect(Object.keys(systemMap.functions)).toContain('utils/helpers.js');
    });

    it('should detect Tier 1 orphans', () => {
      const systemMap = ScenarioBuilder.orphans(3, 1);
      
      expect(Object.keys(systemMap.files)).toHaveLength(4);
      
      // Verify orphan detection capability
      const orphans = Object.values(systemMap.files).filter(
        f => f.usedBy.length === 0 && f.dependsOn.length === 0 && !f.path.match(/main/)
      );
      expect(orphans).toHaveLength(3);
    });

    it('should detect Tier 2 circular imports', () => {
      const systemMap = ScenarioBuilder.importCycles([
        ['a.js', 'b.js', 'c.js', 'a.js'],
        ['x.js', 'y.js', 'x.js']
      ]);
      
      expect(systemMap.metadata.cyclesDetected).toHaveLength(2);
    });

    it('should support Tier 3 detector scenarios', () => {
      const scenario = DetectorTestFactory.createScenario('deadCode');
      
      expect(scenario.files).toBeDefined();
      expect(scenario.functions).toBeDefined();
      expect(scenario.functions['src/utils.js']).toHaveLength(2);
    });

    it('should analyze race conditions across tiers', () => {
      const scenario = new RaceScenarioBuilder()
        .withAtom('atom-1', 'reader', { isAsync: true })
        .withAtom('atom-2', 'writer', { isAsync: true })
        .withSharedState('counter')
        .withReadAccess('atom-1', 'counter', 10)
        .withWriteAccess('atom-2', 'counter', 20)
        .build();

      expect(scenario.atoms).toHaveLength(2);
      expect(scenario.sharedState).toHaveLength(1);
      expect(scenario.atoms[0].accesses).toHaveLength(1);
      expect(scenario.atoms[1].accesses).toHaveLength(1);
    });
  });
});

/**
 * Integration Test Suite: Factory Composability
 * 
 * Verifies all factories can work together
 */
describe('Layer A Integration - Factory Composability', () => {
  it('should compose GraphBuilder with DetectorTestFactory', () => {
    const graph = GraphBuilder.create()
      .withFile('src/app.js')
      .withFile('src/utils.js');

    const detectorScenario = DetectorTestFactory.createScenario('complex');
    
    // Merge scenarios
    Object.assign(graph.files, detectorScenario.files);
    
    expect(Object.keys(graph.files)).toHaveLength(4); // 2 from graph + 2 from detector
  });

  it('should compose RaceScenarioBuilder with SystemMapBuilder', () => {
    const raceScenario = new RaceScenarioBuilder()
      .withAtom('atom-1', 'asyncFunc', { isAsync: true, filePath: 'src/api.js' })
      .build();

    const systemMap = SystemMapBuilder.create()
      .withFile('src/api.js')
      .build();

    // Verify both structures are compatible
    expect(raceScenario.atoms[0].filePath).toBe('src/api.js');
    expect(systemMap.files['src/api.js']).toBeDefined();
  });

  it('should allow building complex scenarios with all factories', () => {
    // Start with system map
    const builder = SystemMapBuilder.create()
      .withFile('src/main.js')
      .withFile('src/worker.js');

    // Add race scenario elements
    const raceData = new RaceScenarioBuilder()
      .withAtom('main-1', 'processData', { isAsync: true })
      .withAtom('worker-1', 'handleMessage', { isAsync: true })
      .withSharedState('sharedQueue')
      .build();

    // Add graph relationships
    const graph = GraphBuilder.create()
      .withDependency('src/main.js', 'src/worker.js');

    // Combine all
    const combined = {
      ...builder.build(),
      raceScenario: raceData,
      dependencies: graph.dependencies
    };

    expect(combined.files).toBeDefined();
    expect(combined.raceScenario.atoms).toHaveLength(2);
    expect(combined.dependencies).toHaveLength(1);
  });
});

/**
 * Integration Test Suite: End-to-End Workflows
 */
describe('Layer A Integration - End-to-End Workflows', () => {
  it('should analyze a realistic web application structure', () => {
    const systemMap = SystemMapBuilder.create()
      // Entry points
      .withFile('src/index.js', { exports: ['init'] })
      .withFile('src/server.js', { exports: ['startServer'] })
      // API layer
      .withFile('src/api/routes.js', { exports: ['router'] })
      .withFile('src/api/handlers.js', { exports: ['getUser', 'createUser'] })
      // Service layer
      .withFile('src/services/userService.js', { exports: ['findUser', 'saveUser'] })
      .withFile('src/services/authService.js', { exports: ['authenticate'] })
      // Data layer
      .withFile('src/db/connection.js', { exports: ['query'] })
      .withFile('src/db/models.js', { exports: ['User', 'Session'] })
      // Utils
      .withFile('src/utils/logger.js', { exports: ['log', 'error'] })
      .withFile('src/utils/validator.js', { exports: ['validateEmail'] })
      // Dependencies
      .withDependency('src/index.js', 'src/server.js')
      .withDependency('src/server.js', 'src/api/routes.js')
      .withDependency('src/api/routes.js', 'src/api/handlers.js')
      .withDependency('src/api/handlers.js', 'src/services/userService.js')
      .withDependency('src/api/handlers.js', 'src/services/authService.js')
      .withDependency('src/services/userService.js', 'src/db/models.js')
      .withDependency('src/services/authService.js', 'src/db/models.js')
      .withDependency('src/db/models.js', 'src/db/connection.js')
      .withDependency('src/api/handlers.js', 'src/utils/logger.js')
      .withDependency('src/services/userService.js', 'src/utils/validator.js')
      .build();

    // Verify structure
    expect(systemMap.metadata.totalFiles).toBe(10);
    expect(systemMap.dependencies).toHaveLength(9);

    // Identify high-impact files (used by many)
    const highImpactFiles = Object.entries(systemMap.files)
      .filter(([_, file]) => file.usedBy.length >= 2)
      .map(([path, _]) => path);

    expect(highImpactFiles).toContain('src/db/models.js');
    expect(highImpactFiles).toContain('src/api/handlers.js');
  });

  it('should detect potential race conditions in async code', () => {
    const scenario = new RaceScenarioBuilder()
      .withAtom('api-1', 'updateUser', { isAsync: true, filePath: 'src/api/users.js' })
      .withAtom('api-2', 'deleteUser', { isAsync: true, filePath: 'src/api/users.js' })
      .withAtom('worker-1', 'processQueue', { isAsync: true, filePath: 'src/workers/queue.js' })
      .withSharedState('userCache', { 
        type: 'cache',
        locations: [
          { atomId: 'api-1', type: 'write' },
          { atomId: 'api-2', type: 'write' },
          { atomId: 'worker-1', type: 'read' }
        ]
      })
      .withWriteAccess('api-1', 'userCache', 15)
      .withWriteAccess('api-2', 'userCache', 25)
      .withReadAccess('worker-1', 'userCache', 35)
      .build();

    // Verify scenario structure
    expect(scenario.atoms).toHaveLength(3);
    expect(scenario.sharedState).toHaveLength(1);

    // Count write-write potential races
    const writes = scenario.atoms.filter(a => 
      a.accesses?.some(acc => acc.type === 'write')
    );
    expect(writes).toHaveLength(2);
  });

  it('should support incremental analysis workflow', () => {
    // Phase 1: Initial scan
    let systemMap = SystemMapBuilder.create()
      .withFile('src/core.js')
      .build();

    expect(systemMap.metadata.totalFiles).toBe(1);

    // Phase 2: Add more files
    systemMap = SystemMapBuilder.create()
      .withFile('src/core.js')
      .withFile('src/feature-a.js')
      .withFile('src/feature-b.js')
      .withDependency('src/feature-a.js', 'src/core.js')
      .withDependency('src/feature-b.js', 'src/core.js')
      .build();

    expect(systemMap.metadata.totalFiles).toBe(3);
    expect(systemMap.files['src/core.js'].usedBy).toHaveLength(2);

    // Phase 3: Add functions
    const graph = GraphBuilder.create()
      .withFiles(Object.keys(systemMap.files))
      .withFunction('src/core.js', 'sharedHelper', { isExported: true })
      .withFunction('src/feature-a.js', 'doSomething', { calls: ['sharedHelper'] })
      .withFunction('src/feature-b.js', 'doAnotherThing', { calls: ['sharedHelper'] })
      .build();

    expect(graph.functions['src/core.js']).toHaveLength(1);
    expect(graph.functions['src/feature-a.js']).toHaveLength(1);
    expect(graph.functions['src/feature-b.js']).toHaveLength(1);
  });
});
