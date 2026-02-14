/**
 * @fileoverview Tests para el Graph Builder de Layer A
 * 
 * Test coverage:
 * - buildSystemMap(): Construcción del grafo
 * - getImpactMap(): Cálculo de impacto
 * - detectCycles(): Detección de ciclos
 * - calculateTransitiveDependencies(): Dependencias transitivas
 */

import { describe, it, expect } from 'vitest';
import { 
  buildSystemMap, 
  getImpactMap, 
  detectCycles,
  calculateTransitiveDependencies,
  calculateTransitiveDependents,
  createEmptySystemMap,
  createFileNode
} from '../../../../src/layer-a-static/graph/index.js';

describe('Layer A - Graph', () => {
  
  describe('createEmptySystemMap() - Initialization', () => {
    it('should create empty system map with correct structure', () => {
      const systemMap = createEmptySystemMap();
      
      expect(systemMap.files).toEqual({});
      expect(systemMap.dependencies).toEqual([]);
      expect(systemMap.exportIndex).toEqual({});
      expect(systemMap.metadata).toBeDefined();
      expect(systemMap.metadata.totalFiles).toBe(0);
    });
  });

  describe('createFileNode() - Node creation', () => {
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
    });
  });

  describe('buildSystemMap() - Graph construction', () => {
    it('should build graph from parsed files object', () => {
      // API expects an object, not array
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

    it('should create export index', () => {
      const parsedFiles = {
        '/src/math.js': {
          fileName: 'math.js',
          imports: [],
          exports: [
            { name: 'add', type: 'function' },
            { name: 'subtract', type: 'function' }
          ],
          definitions: []
        }
      };

      const systemMap = buildSystemMap(parsedFiles, {});
      
      expect(Object.keys(systemMap.exportIndex).length).toBeGreaterThan(0);
    });

    it('should create dependency links between files', () => {
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
      
      // Check dependencies array
      expect(systemMap.dependencies.length).toBeGreaterThan(0);
      
      // Check bidirectional linking
      expect(systemMap.files['/src/b.js'].dependsOn).toContain('/src/a.js');
      expect(systemMap.files['/src/a.js'].usedBy).toContain('/src/b.js');
    });
  });

  describe('getImpactMap() - Impact analysis', () => {
    it('should calculate impact correctly', () => {
      // Create mock file structure
      const files = {
        '/src/utils.js': {
          path: '/src/utils.js',
          displayPath: 'src/utils.js',
          imports: [],
          exports: ['helper'],
          usedBy: ['/src/main.js', '/src/app.js'],
          dependsOn: [],
          transitiveDependents: []
        },
        '/src/main.js': {
          path: '/src/main.js',
          displayPath: 'src/main.js',
          imports: [{ source: './utils.js' }],
          exports: [],
          usedBy: [],
          dependsOn: ['/src/utils.js'],
          transitiveDependents: []
        },
        '/src/app.js': {
          path: '/src/app.js',
          displayPath: 'src/app.js',
          imports: [{ source: './utils.js' }],
          exports: [],
          usedBy: [],
          dependsOn: ['/src/utils.js'],
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
          usedBy: ['/src/middleware.js'],
          transitiveDependents: ['/src/app.js']
        },
        '/src/middleware.js': {
          path: '/src/middleware.js',
          usedBy: ['/src/app.js'],
          transitiveDependents: []
        },
        '/src/app.js': {
          path: '/src/app.js',
          usedBy: [],
          transitiveDependents: []
        }
      };

      const impact = getImpactMap('/src/core.js', files);
      
      expect(impact.directDependents).toContain('/src/middleware.js');
      expect(impact.indirectDependents).toContain('/src/app.js');
    });
  });

  describe('detectCycles() - Cycle detection', () => {
    it('should detect simple cycle', () => {
      const files = {
        '/src/a.js': {
          path: '/src/a.js',
          dependsOn: ['/src/b.js']
        },
        '/src/b.js': {
          path: '/src/b.js',
          dependsOn: ['/src/a.js']
        }
      };

      const cycles = detectCycles(files);
      
      // Should find at least one cycle
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should return empty array when no cycles', () => {
      const files = {
        '/src/a.js': {
          path: '/src/a.js',
          dependsOn: []
        },
        '/src/b.js': {
          path: '/src/b.js',
          dependsOn: ['/src/a.js']
        }
      };

      const cycles = detectCycles(files);
      
      // Acyclic: a -> b, no cycles
      expect(cycles).toEqual([]);
    });

    it('should detect complex cycle chain', () => {
      const files = {
        '/src/a.js': {
          path: '/src/a.js',
          dependsOn: ['/src/b.js']
        },
        '/src/b.js': {
          path: '/src/b.js',
          dependsOn: ['/src/c.js']
        },
        '/src/c.js': {
          path: '/src/c.js',
          dependsOn: ['/src/a.js']
        }
      };

      const cycles = detectCycles(files);
      
      expect(cycles.length).toBeGreaterThan(0);
      // Cycle: a -> b -> c -> a
    });
  });

  describe('calculateTransitiveDependencies()', () => {
    it('should calculate all dependencies transitively', () => {
      const files = {
        '/src/app.js': {
          path: '/src/app.js',
          dependsOn: ['/src/routes.js']
        },
        '/src/routes.js': {
          path: '/src/routes.js',
          dependsOn: ['/src/controllers.js']
        },
        '/src/controllers.js': {
          path: '/src/controllers.js',
          dependsOn: ['/src/models.js']
        },
        '/src/models.js': {
          path: '/src/models.js',
          dependsOn: []
        }
      };

      const deps = calculateTransitiveDependencies('/src/app.js', files);
      
      // app depends on routes, controllers and models (transitively)
      expect(deps).toContain('/src/routes.js');
      expect(deps).toContain('/src/controllers.js');
      expect(deps).toContain('/src/models.js');
    });

    it('should return empty set for file with no dependencies', () => {
      const files = {
        '/src/utils.js': {
          path: '/src/utils.js',
          dependsOn: []
        }
      };

      const deps = calculateTransitiveDependencies('/src/utils.js', files);
      
      expect(deps.size).toBe(0);
    });
  });

  describe('calculateTransitiveDependents()', () => {
    it('should calculate all dependents transitively', () => {
      const files = {
        '/src/utils.js': {
          path: '/src/utils.js',
          usedBy: ['/src/helpers.js']
        },
        '/src/helpers.js': {
          path: '/src/helpers.js',
          usedBy: ['/src/services.js']
        },
        '/src/services.js': {
          path: '/src/services.js',
          usedBy: ['/src/app.js']
        },
        '/src/app.js': {
          path: '/src/app.js',
          usedBy: []
        }
      };

      const dependents = calculateTransitiveDependents('/src/utils.js', files);
      
      // utils is used by helpers, services and app (transitively)
      expect(dependents).toContain('/src/helpers.js');
      expect(dependents).toContain('/src/services.js');
      expect(dependents).toContain('/src/app.js');
    });
  });
});
