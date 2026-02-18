/**
 * @fileoverview Layer Graph Unit Tests
 * 
 * Tests para verificar el funcionamiento del sistema de grafos.
 */

import { describe, it, expect } from 'vitest';
import { 
  buildSystemMap, 
  getImpactMap, 
  detectCycles,
  isInCycle,
  getFilesInCycles,
  calculateTransitiveDependencies,
  calculateTransitiveDependents,
  createEmptySystemMap,
  createFileNode,
  serializeGraph,
  deserializeGraph,
  getGraphDelta,
  normalizePath,
  RISK_LEVELS
} from '#layer-graph/index.js';

describe('Layer Graph - Core', () => {
  
  describe('createEmptySystemMap()', () => {
    it('should create empty system map with all required fields', () => {
      const systemMap = createEmptySystemMap();
      
      expect(systemMap.files).toEqual({});
      expect(systemMap.dependencies).toEqual([]);
      expect(systemMap.functions).toEqual({});
      expect(systemMap.function_links).toEqual([]);
      expect(systemMap.exportIndex).toEqual({});
      expect(systemMap.unresolvedImports).toEqual({});
      expect(systemMap.metadata).toBeDefined();
      expect(systemMap.metadata.totalFiles).toBe(0);
      expect(systemMap.metadata.cyclesDetected).toEqual([]);
    });
  });

  describe('createFileNode()', () => {
    it('should create file node with correct structure', () => {
      const node = createFileNode('/src/test.js', 'src/test.js', {
        exports: [{ name: 'foo' }],
        imports: [{ source: './bar.js' }]
      });
      
      expect(node.path).toBe('/src/test.js');
      expect(node.displayPath).toBe('src/test.js');
      expect(node.exports).toEqual([{ name: 'foo' }]);
      expect(node.imports).toEqual([{ source: './bar.js' }]);
      expect(node.usedBy).toEqual([]);
      expect(node.dependsOn).toEqual([]);
      expect(node.transitiveDepends).toEqual([]);
      expect(node.transitiveDependents).toEqual([]);
    });
  });
});

describe('Layer Graph - Builders', () => {
  
  describe('buildSystemMap()', () => {
    it('should build graph from parsed files', () => {
      const parsedFiles = {
        '/src/utils.js': {
          fileName: 'utils.js',
          imports: [],
          exports: [{ name: 'helper', type: 'function' }],
          definitions: [{ name: 'helper', type: 'function', line: 1 }]
        },
        '/src/main.js': {
          fileName: 'main.js',
          imports: [{ source: './utils.js', specifiers: ['helper'] }],
          exports: [{ name: 'default', type: 'default' }],
          definitions: []
        }
      };

      const resolvedImports = {
        '/src/main.js': [
          { source: './utils.js', resolved: '/src/utils.js', type: 'esm' }
        ]
      };

      const systemMap = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(Object.keys(systemMap.files)).toHaveLength(2);
      expect(systemMap.files['/src/utils.js']).toBeDefined();
      expect(systemMap.files['/src/main.js']).toBeDefined();
    });

    it('should create bidirectional links', () => {
      const parsedFiles = {
        '/src/a.js': {
          fileName: 'a.js',
          imports: [],
          exports: [{ name: 'foo', type: 'function' }],
          definitions: []
        },
        '/src/b.js': {
          fileName: 'b.js',
          imports: [{ source: './a.js', specifiers: ['foo'] }],
          exports: [],
          definitions: []
        }
      };

      const resolvedImports = {
        '/src/b.js': [
          { source: './a.js', resolved: '/src/a.js', type: 'esm' }
        ]
      };

      const systemMap = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(systemMap.files['/src/b.js'].dependsOn).toContain('/src/a.js');
      expect(systemMap.files['/src/a.js'].usedBy).toContain('/src/b.js');
    });

    it('should detect cycles during build', () => {
      const parsedFiles = {
        '/src/a.js': {
          fileName: 'a.js',
          imports: [{ source: './b.js' }],
          exports: [],
          definitions: []
        },
        '/src/b.js': {
          fileName: 'b.js',
          imports: [{ source: './a.js' }],
          exports: [],
          definitions: []
        }
      };

      const resolvedImports = {
        '/src/a.js': [{ source: './b.js', resolved: '/src/b.js' }],
        '/src/b.js': [{ source: './a.js', resolved: '/src/a.js' }]
      };

      const systemMap = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(systemMap.metadata.cyclesDetected.length).toBeGreaterThan(0);
    });
  });
});

describe('Layer Graph - Algorithms', () => {
  
  describe('detectCycles()', () => {
    it('should detect simple cycle', () => {
      const files = {
        '/src/a.js': { dependsOn: ['/src/b.js'] },
        '/src/b.js': { dependsOn: ['/src/a.js'] }
      };

      const cycles = detectCycles(files);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should detect chain cycle', () => {
      const files = {
        '/src/a.js': { dependsOn: ['/src/b.js'] },
        '/src/b.js': { dependsOn: ['/src/c.js'] },
        '/src/c.js': { dependsOn: ['/src/a.js'] }
      };

      const cycles = detectCycles(files);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should return empty array for acyclic graph', () => {
      const files = {
        '/src/a.js': { dependsOn: [] },
        '/src/b.js': { dependsOn: ['/src/a.js'] }
      };

      const cycles = detectCycles(files);
      expect(cycles).toEqual([]);
    });
  });

  describe('isInCycle()', () => {
    it('should return true for file in cycle', () => {
      const cycles = [['/src/a.js', '/src/b.js', '/src/a.js']];
      expect(isInCycle('/src/a.js', cycles)).toBe(true);
      expect(isInCycle('/src/b.js', cycles)).toBe(true);
    });

    it('should return false for file not in cycle', () => {
      const cycles = [['/src/a.js', '/src/b.js', '/src/a.js']];
      expect(isInCycle('/src/c.js', cycles)).toBe(false);
    });
  });

  describe('getFilesInCycles()', () => {
    it('should return all files in cycles', () => {
      const cycles = [
        ['/src/a.js', '/src/b.js', '/src/a.js'],
        ['/src/c.js', '/src/d.js', '/src/c.js']
      ];

      const files = getFilesInCycles(cycles);
      expect(files.has('/src/a.js')).toBe(true);
      expect(files.has('/src/b.js')).toBe(true);
      expect(files.has('/src/c.js')).toBe(true);
      expect(files.has('/src/d.js')).toBe(true);
    });
  });

  describe('getImpactMap()', () => {
    it('should calculate direct impact', () => {
      const files = {
        '/src/utils.js': {
          path: '/src/utils.js',
          displayPath: 'src/utils.js',
          usedBy: ['/src/main.js', '/src/app.js'],
          transitiveDependents: []
        }
      };

      const impact = getImpactMap('/src/utils.js', files);
      
      expect(impact.filePath).toBe('src/utils.js');
      expect(impact.directDependents).toContain('/src/main.js');
      expect(impact.directDependents).toContain('/src/app.js');
      expect(impact.totalFilesAffected).toBe(2);
    });

    it('should calculate transitive impact', () => {
      const files = {
        '/src/core.js': {
          path: '/src/core.js',
          displayPath: 'src/core.js',
          usedBy: ['/src/middleware.js'],
          transitiveDependents: ['/src/app.js']
        }
      };

      const impact = getImpactMap('/src/core.js', files);
      
      expect(impact.indirectDependents).toContain('/src/app.js');
    });

    it('should calculate risk level', () => {
      const files = {
        '/src/utils.js': {
          path: '/src/utils.js',
          displayPath: 'src/utils.js',
          usedBy: ['/src/a.js', '/src/b.js', '/src/c.js', '/src/d.js'],
          transitiveDependents: []
        }
      };

      const impact = getImpactMap('/src/utils.js', files);
      expect(impact.riskLevel).toBe(RISK_LEVELS.MEDIUM);
    });
  });

  describe('calculateTransitiveDependencies()', () => {
    it('should calculate all transitive dependencies', () => {
      const files = {
        '/src/app.js': { dependsOn: ['/src/routes.js'] },
        '/src/routes.js': { dependsOn: ['/src/controllers.js'] },
        '/src/controllers.js': { dependsOn: ['/src/models.js'] },
        '/src/models.js': { dependsOn: [] }
      };

      const deps = calculateTransitiveDependencies('/src/app.js', files);
      
      expect(deps.has('/src/routes.js')).toBe(true);
      expect(deps.has('/src/controllers.js')).toBe(true);
      expect(deps.has('/src/models.js')).toBe(true);
    });
  });

  describe('calculateTransitiveDependents()', () => {
    it('should calculate all transitive dependents', () => {
      const files = {
        '/src/utils.js': { usedBy: ['/src/helpers.js'] },
        '/src/helpers.js': { usedBy: ['/src/services.js'] },
        '/src/services.js': { usedBy: ['/src/app.js'] },
        '/src/app.js': { usedBy: [] }
      };

      const dependents = calculateTransitiveDependents('/src/utils.js', files);
      
      expect(dependents.has('/src/helpers.js')).toBe(true);
      expect(dependents.has('/src/services.js')).toBe(true);
      expect(dependents.has('/src/app.js')).toBe(true);
    });
  });
});

describe('Layer Graph - Persistence', () => {
  
  describe('serializeGraph() / deserializeGraph()', () => {
    it('should serialize and deserialize graph correctly', () => {
      const systemMap = createEmptySystemMap();
      systemMap.files['/src/test.js'] = { path: '/src/test.js' };
      systemMap.metadata.totalFiles = 1;

      const json = serializeGraph(systemMap);
      const restored = deserializeGraph(json);
      
      expect(restored.files['/src/test.js']).toBeDefined();
      expect(restored.metadata.totalFiles).toBe(1);
    });
  });

  describe('getGraphDelta()', () => {
    it('should detect added files', () => {
      const oldGraph = { files: { '/src/a.js': {} } };
      const newGraph = { files: { '/src/a.js': {}, '/src/b.js': {} } };

      const delta = getGraphDelta(oldGraph, newGraph);
      
      expect(delta.added.files).toContain('/src/b.js');
      expect(delta.removed.files).toEqual([]);
    });

    it('should detect removed files', () => {
      const oldGraph = { files: { '/src/a.js': {}, '/src/b.js': {} } };
      const newGraph = { files: { '/src/a.js': {} } };

      const delta = getGraphDelta(oldGraph, newGraph);
      
      expect(delta.removed.files).toContain('/src/b.js');
      expect(delta.added.files).toEqual([]);
    });
  });
});

describe('Layer Graph - Utils', () => {
  
  describe('normalizePath()', () => {
    it('should normalize Windows paths to Unix format', () => {
      expect(normalizePath('src\\test.js')).toBe('src/test.js');
      expect(normalizePath('C:\\project\\src\\test.js')).toMatch(/project\/src\/test.js/);
    });

    it('should handle null/undefined', () => {
      expect(normalizePath(null)).toBe('');
      expect(normalizePath(undefined)).toBe('');
    });
  });
});
