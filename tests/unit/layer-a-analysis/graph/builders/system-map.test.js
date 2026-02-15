import { describe, it, expect } from 'vitest';
import { buildSystemMap } from '#layer-a/graph/builders/system-map.js';
import { SystemMapBuilder, GraphScenarios } from '../../../../factories/graph-test.factory.js';

describe('SystemMap Builder', () => {
  describe('Structure Contract', () => {
    it('should export buildSystemMap function', () => {
      expect(typeof buildSystemMap).toBe('function');
    });

    it('buildSystemMap should return SystemMap object', () => {
      const result = buildSystemMap({}, {});
      
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('functions');
      expect(result).toHaveProperty('function_links');
      expect(result).toHaveProperty('unresolvedImports');
      expect(result).toHaveProperty('reexportChains');
      expect(result).toHaveProperty('exportIndex');
      expect(result).toHaveProperty('metadata');
    });

    it('should have metadata with all required fields', () => {
      const result = buildSystemMap({}, {});
      
      expect(result.metadata).toHaveProperty('totalFiles');
      expect(result.metadata).toHaveProperty('totalDependencies');
      expect(result.metadata).toHaveProperty('totalFunctions');
      expect(result.metadata).toHaveProperty('totalFunctionLinks');
      expect(result.metadata).toHaveProperty('totalUnresolved');
      expect(result.metadata).toHaveProperty('totalReexports');
      expect(result.metadata).toHaveProperty('totalTypes');
      expect(result.metadata).toHaveProperty('totalEnums');
      expect(result.metadata).toHaveProperty('totalConstants');
      expect(result.metadata).toHaveProperty('totalSharedObjects');
      expect(result.metadata).toHaveProperty('cyclesDetected');
    });
  });

  describe('File Node Creation', () => {
    it('should create file nodes for all parsed files', () => {
      const parsedFiles = {
        'src/a.js': { exports: [], imports: [] },
        'src/b.js': { exports: [], imports: [] }
      };
      
      const result = buildSystemMap(parsedFiles, {});
      
      expect(Object.keys(result.files)).toHaveLength(2);
      expect(result.files).toHaveProperty('src/a.js');
      expect(result.files).toHaveProperty('src/b.js');
    });

    it('should normalize file paths', () => {
      const parsedFiles = {
        'src\\windows\\file.js': { exports: [] }
      };
      
      const result = buildSystemMap(parsedFiles, {});
      
      // Should use normalized path as key
      const keys = Object.keys(result.files);
      expect(keys[0]).not.toContain('\\');
    });

    it('should set display paths correctly', () => {
      const parsedFiles = {
        '/project/src/utils/helpers.js': { exports: [] }
      };
      
      const result = buildSystemMap(parsedFiles, {});
      
      const fileNode = result.files['/project/src/utils/helpers.js'];
      expect(fileNode.displayPath).toContain('src/');
    });

    it('should preserve file info in node', () => {
      const parsedFiles = {
        'src/file.js': {
          exports: [{ name: 'foo', type: 'named' }],
          imports: [{ source: './bar', type: 'static' }],
          definitions: [{ name: 'MyClass', type: 'class' }],
          calls: [{ name: 'console.log', line: 10 }],
          identifierRefs: [{ name: 'CONST', line: 5 }]
        }
      };
      
      const result = buildSystemMap(parsedFiles, {});
      const fileNode = result.files['src/file.js'];
      
      expect(fileNode.exports).toHaveLength(1);
      expect(fileNode.imports).toHaveLength(1);
      expect(fileNode.definitions).toHaveLength(1);
      expect(fileNode.calls).toHaveLength(1);
      expect(fileNode.identifierRefs).toHaveLength(1);
    });
  });

  describe('Dependency Creation', () => {
    it('should create dependencies from resolved imports', () => {
      const parsedFiles = {
        'src/a.js': { exports: [], imports: [] },
        'src/b.js': { exports: [], imports: [] }
      };
      
      const resolvedImports = {
        'src/a.js': [
          { source: './b', resolved: 'src/b.js', type: 'static' }
        ]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0].from).toContain('a.js');
      expect(result.dependencies[0].to).toContain('b.js');
    });

    it('should update bidirectional relationships', () => {
      const parsedFiles = {
        'src/a.js': { exports: [], imports: [] },
        'src/b.js': { exports: [], imports: [] }
      };
      
      const resolvedImports = {
        'src/a.js': [
          { source: './b', resolved: 'src/b.js', type: 'static' }
        ]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(result.files['src/a.js'].dependsOn).toContain('src/b.js');
      expect(result.files['src/b.js'].usedBy).toContain('src/a.js');
    });

    it('should avoid duplicate dependencies', () => {
      const parsedFiles = {
        'src/a.js': { exports: [], imports: [] },
        'src/b.js': { exports: [], imports: [] }
      };
      
      const resolvedImports = {
        'src/a.js': [
          { source: './b', resolved: 'src/b.js', type: 'static' },
          { source: './b', resolved: 'src/b.js', type: 'static' } // Duplicate
        ]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(result.dependencies).toHaveLength(1);
    });

    it('should track unresolved imports', () => {
      const parsedFiles = {
        'src/a.js': { exports: [], imports: [] }
      };
      
      const resolvedImports = {
        'src/a.js': [
          { source: 'missing-package', resolved: null, type: 'unresolved' }
        ]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(result.unresolvedImports).toHaveProperty('src/a.js');
      expect(result.unresolvedImports['src/a.js']).toHaveLength(1);
    });

    it('should handle dynamic imports with known source', () => {
      const parsedFiles = {
        'src/a.js': { exports: [], imports: [] },
        'src/b.js': { exports: [], imports: [] }
      };
      
      const resolvedImports = {
        'src/a.js': [
          { source: 'src/b.js', resolved: 'src/b.js', type: 'dynamic' }
        ]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0].dynamic).toBe(true);
    });

    it('should skip dynamic imports with variable sources', () => {
      const parsedFiles = {
        'src/a.js': { exports: [], imports: [] }
      };
      
      const resolvedImports = {
        'src/a.js': [
          { source: '<dynamic>', type: 'dynamic' }
        ]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      // Should not create dependency but also not crash
      expect(result.dependencies).toHaveLength(0);
    });
  });

  describe('Function Processing', () => {
    it('should collect functions from parsed files', () => {
      const parsedFiles = {
        'src/utils.js': {
          functions: [
            { id: 'utils::helper', name: 'helper', line: 10 }
          ]
        }
      };
      
      const result = buildSystemMap(parsedFiles, {});
      
      expect(result.functions['src/utils.js']).toHaveLength(1);
      expect(result.metadata.totalFunctions).toBe(1);
    });

    it('should create function links', () => {
      const parsedFiles = {
        'src/a.js': {
          functions: [
            {
              id: 'a::main',
              name: 'main',
              calls: [{ name: 'helper', line: 10 }]
            }
          ]
        },
        'src/b.js': {
          functions: [
            { id: 'b::helper', name: 'helper', line: 5 }
          ]
        }
      };
      
      const resolvedImports = {
        'src/a.js': [
          { source: './b', resolved: 'src/b.js', type: 'static' }
        ]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(result.function_links.length).toBeGreaterThan(0);
      expect(result.metadata.totalFunctionLinks).toBeGreaterThan(0);
    });
  });

  describe('Transitive Dependencies', () => {
    it('should calculate transitive dependencies', () => {
      const parsedFiles = {
        'src/a.js': { exports: [], imports: [] },
        'src/b.js': { exports: [], imports: [] },
        'src/c.js': { exports: [], imports: [] }
      };
      
      const resolvedImports = {
        'src/a.js': [{ source: './b', resolved: 'src/b.js', type: 'static' }],
        'src/b.js': [{ source: './c', resolved: 'src/c.js', type: 'static' }]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      // a.js transitively depends on both b.js and c.js
      expect(result.files['src/a.js'].transitiveDepends).toContain('src/b.js');
      expect(result.files['src/a.js'].transitiveDepends).toContain('src/c.js');
    });

    it('should calculate transitive dependents', () => {
      const parsedFiles = {
        'src/a.js': { exports: [], imports: [] },
        'src/b.js': { exports: [], imports: [] },
        'src/c.js': { exports: [], imports: [] }
      };
      
      const resolvedImports = {
        'src/b.js': [{ source: './a', resolved: 'src/a.js', type: 'static' }],
        'src/c.js': [{ source: './b', resolved: 'src/b.js', type: 'static' }]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      // a.js has b.js and c.js as transitive dependents
      expect(result.files['src/a.js'].transitiveDependents).toContain('src/b.js');
      expect(result.files['src/a.js'].transitiveDependents).toContain('src/c.js');
    });
  });

  describe('Cycle Detection', () => {
    it('should detect cycles in the graph', () => {
      const parsedFiles = {
        'src/a.js': { exports: [], imports: [] },
        'src/b.js': { exports: [], imports: [] },
        'src/c.js': { exports: [], imports: [] }
      };
      
      const resolvedImports = {
        'src/a.js': [{ source: './b', resolved: 'src/b.js', type: 'static' }],
        'src/b.js': [{ source: './c', resolved: 'src/c.js', type: 'static' }],
        'src/c.js': [{ source: './a', resolved: 'src/a.js', type: 'static' }]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(result.metadata.cyclesDetected.length).toBeGreaterThan(0);
    });

    it('should not detect cycles in acyclic graph', () => {
      const parsedFiles = {
        'src/a.js': { exports: [], imports: [] },
        'src/b.js': { exports: [], imports: [] },
        'src/c.js': { exports: [], imports: [] }
      };
      
      const resolvedImports = {
        'src/a.js': [{ source: './b', resolved: 'src/b.js', type: 'static' }],
        'src/b.js': [{ source: './c', resolved: 'src/c.js', type: 'static' }]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(result.metadata.cyclesDetected).toHaveLength(0);
    });
  });

  describe('Tier 3 Data Processing', () => {
    it('should collect type definitions', () => {
      const parsedFiles = {
        'src/types.js': {
          typeDefinitions: [
            { name: 'User', line: 10 },
            { name: 'Config', line: 20 }
          ]
        }
      };
      
      const result = buildSystemMap(parsedFiles, {});
      
      expect(result.typeDefinitions['src/types.js']).toHaveLength(2);
      expect(result.metadata.totalTypes).toBe(2);
    });

    it('should collect enum definitions', () => {
      const parsedFiles = {
        'src/enums.js': {
          enumDefinitions: [
            { name: 'Status', values: ['active', 'inactive'] }
          ]
        }
      };
      
      const result = buildSystemMap(parsedFiles, {});
      
      expect(result.enumDefinitions['src/enums.js']).toHaveLength(1);
      expect(result.metadata.totalEnums).toBe(1);
    });

    it('should collect constant exports', () => {
      const parsedFiles = {
        'src/constants.js': {
          constantExports: [
            { name: 'MAX_SIZE', value: 100 }
          ]
        }
      };
      
      const result = buildSystemMap(parsedFiles, {});
      
      expect(result.constantExports['src/constants.js']).toHaveLength(1);
      expect(result.metadata.totalConstants).toBe(1);
    });

    it('should collect object exports', () => {
      const parsedFiles = {
        'src/config.js': {
          objectExports: [
            { name: 'defaultConfig', properties: ['apiUrl', 'timeout'] }
          ]
        }
      };
      
      const result = buildSystemMap(parsedFiles, {});
      
      expect(result.objectExports['src/config.js']).toHaveLength(1);
      expect(result.metadata.totalSharedObjects).toBe(1);
    });

    it('should collect type usages', () => {
      const parsedFiles = {
        'src/app.js': {
          typeUsages: [
            { type: 'User', line: 15 },
            { type: 'Config', line: 20 }
          ]
        }
      };
      
      const result = buildSystemMap(parsedFiles, {});
      
      expect(result.typeUsages['src/app.js']).toHaveLength(2);
    });
  });

  describe('Metadata Calculation', () => {
    it('should count total files correctly', () => {
      const parsedFiles = {
        'src/a.js': {},
        'src/b.js': {},
        'src/c.js': {}
      };
      
      const result = buildSystemMap(parsedFiles, {});
      
      expect(result.metadata.totalFiles).toBe(3);
    });

    it('should count dependencies correctly', () => {
      const parsedFiles = {
        'src/a.js': {},
        'src/b.js': {},
        'src/c.js': {}
      };
      
      const resolvedImports = {
        'src/a.js': [{ source: './b', resolved: 'src/b.js', type: 'static' }],
        'src/b.js': [{ source: './c', resolved: 'src/c.js', type: 'static' }]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(result.metadata.totalDependencies).toBe(2);
    });

    it('should count unresolved imports correctly', () => {
      const parsedFiles = { 'src/a.js': {} };
      
      const resolvedImports = {
        'src/a.js': [
          { source: 'missing1', resolved: null, type: 'unresolved' },
          { source: 'missing2', resolved: null, type: 'unresolved' }
        ]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(result.metadata.totalUnresolved).toBe(2);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle empty parsedFiles', () => {
      expect(() => buildSystemMap({}, {})).not.toThrow();
    });

    it('should handle null parsedFiles', () => {
      expect(() => buildSystemMap(null, {})).not.toThrow();
    });

    it('should handle null resolvedImports', () => {
      expect(() => buildSystemMap({}, null)).not.toThrow();
    });

    it('should skip files not in parsedFiles when processing imports', () => {
      const parsedFiles = {
        'src/a.js': {}
      };
      
      const resolvedImports = {
        'src/b.js': [{ source: './a', resolved: 'src/a.js', type: 'static' }]
      };
      
      // Should not throw even though src/b.js is not in parsedFiles
      expect(() => buildSystemMap(parsedFiles, resolvedImports)).not.toThrow();
    });

    it('should handle valid import entries', () => {
      const parsedFiles = { 
        'src/a.js': {},
        'src/b.js': {}
      };
      
      const resolvedImports = {
        'src/a.js': [
          { source: './b', resolved: 'src/b.js', type: 'static' }
        ]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      expect(result.dependencies).toHaveLength(1);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should build complete system map for simple project', () => {
      const parsedFiles = {
        'src/index.js': {
          exports: [{ name: 'main', type: 'named' }],
          imports: [{ source: './utils', type: 'static' }],
          functions: [{ id: 'index::main', name: 'main', line: 1, calls: [] }]
        },
        'src/utils.js': {
          exports: [{ name: 'helper', type: 'named' }],
          imports: [],
          functions: [{ id: 'utils::helper', name: 'helper', line: 1, calls: [] }]
        }
      };
      
      const resolvedImports = {
        'src/index.js': [{ source: './utils', resolved: 'src/utils.js', type: 'static' }]
      };
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(result.metadata.totalFiles).toBe(2);
      expect(result.metadata.totalDependencies).toBe(1);
      expect(result.metadata.totalFunctions).toBe(2);
      expect(result.files['src/index.js'].dependsOn).toContain('src/utils.js');
      expect(result.files['src/utils.js'].usedBy).toContain('src/index.js');
    });

    it('should handle complex dependency graph', () => {
      const parsedFiles = {};
      for (let i = 0; i < 10; i++) {
        parsedFiles[`src/file${i}.js`] = { exports: [], imports: [] };
      }
      
      const resolvedImports = {};
      for (let i = 0; i < 9; i++) {
        resolvedImports[`src/file${i}.js`] = [
          { source: `./file${i + 1}`, resolved: `src/file${i + 1}.js`, type: 'static' }
        ];
      }
      
      const result = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(result.metadata.totalFiles).toBe(10);
      expect(result.metadata.totalDependencies).toBe(9);
      
      // Check transitive dependencies
      const firstFile = result.files['src/file0.js'];
      expect(firstFile.transitiveDepends.length).toBe(9);
    });
  });
});
