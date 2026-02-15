import { describe, it, expect } from 'vitest';
import * as graph from '#layer-a/graph/index.js';

describe('Graph Module Index', () => {
  describe('Structure Contract', () => {
    it('should export buildGraph', () => {
      expect(typeof graph.buildGraph).toBe('function');
    });

    it('should export buildSystemMap (alias of buildGraph)', () => {
      expect(typeof graph.buildSystemMap).toBe('function');
      expect(graph.buildSystemMap).toBe(graph.buildGraph);
    });

    it('should export getImpactMap', () => {
      expect(typeof graph.getImpactMap).toBe('function');
    });

    it('should export type factories', () => {
      expect(typeof graph.createEmptySystemMap).toBe('function');
      expect(typeof graph.createFileNode).toBe('function');
      expect(typeof graph.createDependency).toBe('function');
      expect(typeof graph.createFunctionLink).toBe('function');
      expect(typeof graph.createImpactInfo).toBe('function');
    });

    it('should export builders', () => {
      expect(typeof graph.buildExportIndex).toBe('function');
      expect(typeof graph.buildFunctionLinks).toBe('function');
    });

    it('should export algorithms', () => {
      expect(typeof graph.detectCycles).toBe('function');
      expect(typeof graph.calculateTransitiveDependencies).toBe('function');
      expect(typeof graph.calculateTransitiveDependents).toBe('function');
      expect(typeof graph.calculateRiskLevel).toBe('function');
      expect(typeof graph.generateRecommendation).toBe('function');
      expect(typeof graph.findHighImpactFiles).toBe('function');
      expect(typeof graph.getMultipleImpactMaps).toBe('function');
    });

    it('should export resolvers', () => {
      expect(typeof graph.findFunctionInResolution).toBe('function');
    });

    it('should export path utils', () => {
      expect(typeof graph.normalizePath).toBe('function');
      expect(typeof graph.getDisplayPath).toBe('function');
      expect(typeof graph.resolveImportPath).toBe('function');
      expect(typeof graph.uniquePaths).toBe('function');
      expect(typeof graph.pathsEqual).toBe('function');
      expect(typeof graph.getFileExtension).toBe('function');
      expect(typeof graph.isRelativePath).toBe('function');
    });

    it('should export counters', () => {
      expect(typeof graph.countTotalFunctions).toBe('function');
      expect(typeof graph.countTotalItems).toBe('function');
      expect(typeof graph.countUnresolvedImports).toBe('function');
      expect(typeof graph.countFiles).toBe('function');
      expect(typeof graph.countDependencies).toBe('function');
    });

    it('should export RISK_LEVELS constant', () => {
      expect(graph.RISK_LEVELS).toBeDefined();
      expect(typeof graph.RISK_LEVELS).toBe('object');
    });
  });

  describe('Namespace Exports', () => {
    it('should export types namespace', () => {
      expect(graph.types).toBeDefined();
      expect(typeof graph.types).toBe('object');
    });

    it('types namespace should contain type functions', () => {
      expect(typeof graph.types.createEmptySystemMap).toBe('function');
      expect(typeof graph.types.createFileNode).toBe('function');
      expect(typeof graph.types.createDependency).toBe('function');
      expect(typeof graph.types.createFunctionLink).toBe('function');
      expect(typeof graph.types.createImpactInfo).toBe('function');
    });

    it('should export algorithms namespace', () => {
      expect(graph.algorithms).toBeDefined();
      expect(typeof graph.algorithms).toBe('object');
    });

    it('algorithms namespace should contain algorithm functions', () => {
      expect(typeof graph.algorithms.detectCycles).toBe('function');
      expect(typeof graph.algorithms.calculateTransitiveDependencies).toBe('function');
      expect(typeof graph.algorithms.calculateTransitiveDependents).toBe('function');
      expect(typeof graph.algorithms.calculateRiskLevel).toBe('function');
      expect(typeof graph.algorithms.generateRecommendation).toBe('function');
      expect(typeof graph.algorithms.findHighImpactFiles).toBe('function');
      expect(typeof graph.algorithms.getImpactMap).toBe('function');
      expect(typeof graph.algorithms.getMultipleImpactMaps).toBe('function');
    });

    it('should export utils namespace', () => {
      expect(graph.utils).toBeDefined();
      expect(typeof graph.utils).toBe('object');
    });

    it('utils namespace should contain path utilities', () => {
      expect(typeof graph.utils.path).toBe('object');
      expect(typeof graph.utils.path.normalizePath).toBe('function');
      expect(typeof graph.utils.path.getDisplayPath).toBe('function');
    });

    it('utils namespace should contain counters', () => {
      expect(typeof graph.utils.counters).toBe('object');
      expect(typeof graph.utils.counters.countTotalFunctions).toBe('function');
    });

    it('should export resolvers namespace', () => {
      expect(graph.resolvers).toBeDefined();
      expect(typeof graph.resolvers).toBe('object');
    });

    it('resolvers namespace should contain resolver functions', () => {
      expect(typeof graph.resolvers.findFunctionInResolution).toBe('function');
    });

    it('should export builders namespace', () => {
      expect(graph.builders).toBeDefined();
      expect(typeof graph.builders).toBe('object');
    });

    it('builders namespace should contain builder functions', () => {
      expect(typeof graph.builders.buildExportIndex).toBe('function');
      expect(typeof graph.builders.buildFunctionLinks).toBe('function');
    });
  });

  describe('API Integration', () => {
    it('should build system map using public API', () => {
      const parsedFiles = {
        'src/a.js': { exports: [], imports: [] },
        'src/b.js': { exports: [], imports: [] }
      };
      const resolvedImports = {
        'src/a.js': [{ source: './b', resolved: 'src/b.js', type: 'static' }]
      };
      
      const systemMap = graph.buildSystemMap(parsedFiles, resolvedImports);
      
      expect(systemMap).toHaveProperty('files');
      expect(systemMap).toHaveProperty('dependencies');
      expect(systemMap).toHaveProperty('metadata');
    });

    it('should create types using public API', () => {
      const systemMap = graph.createEmptySystemMap();
      expect(systemMap).toHaveProperty('files');
      expect(systemMap).toHaveProperty('dependencies');

      const fileNode = graph.createFileNode('/src/test.js', 'src/test.js', {});
      expect(fileNode).toHaveProperty('path');
      expect(fileNode).toHaveProperty('exports');

      const dependency = graph.createDependency('a.js', 'b.js', {});
      expect(dependency).toHaveProperty('from');
      expect(dependency).toHaveProperty('to');
    });

    it('should detect cycles using public API', () => {
      const files = {
        'a.js': { dependsOn: ['b.js'] },
        'b.js': { dependsOn: ['c.js'] },
        'c.js': { dependsOn: ['a.js'] }
      };
      
      const cycles = graph.detectCycles(files);
      expect(Array.isArray(cycles)).toBe(true);
    });

    it('should calculate transitive dependencies using public API', () => {
      const files = {
        'a.js': { dependsOn: ['b.js'] },
        'b.js': { dependsOn: ['c.js'] },
        'c.js': { dependsOn: [] }
      };
      
      const deps = graph.calculateTransitiveDependencies('a.js', files);
      expect(deps instanceof Set).toBe(true);
    });

    it('should analyze impact using public API', () => {
      const files = {
        'utils.js': { usedBy: ['app.js'], transitiveDependents: [] }
      };
      
      const impact = graph.getImpactMap('utils.js', files);
      expect(impact).toHaveProperty('filePath');
      expect(impact).toHaveProperty('directDependents');
      expect(impact).toHaveProperty('riskLevel');
    });

    it('should use path utilities through public API', () => {
      expect(graph.normalizePath('src\\file.js')).toBe('src/file.js');
      expect(graph.getDisplayPath('/project/src/utils.js')).toContain('src/');
      expect(graph.resolveImportPath('/src/a.js', './b')).toBe('/src/b.js');
      expect(graph.isRelativePath('./file.js')).toBe(true);
      expect(graph.isRelativePath('lodash')).toBe(false);
    });

    it('should use counter utilities through public API', () => {
      const functions = {
        'a.js': [{}, {}],
        'b.js': [{}]
      };
      expect(graph.countTotalFunctions(functions)).toBe(3);

      const files = { 'a.js': {}, 'b.js': {} };
      expect(graph.countFiles(files)).toBe(2);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle empty input to buildGraph', () => {
      expect(() => graph.buildGraph({}, {})).not.toThrow();
    });

    it('should handle null input to detectCycles', () => {
      const result = graph.detectCycles(null);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle null input to getImpactMap', () => {
      const impact = graph.getImpactMap('test.js', {});
      expect(impact.error || impact.filePath).toBeDefined();
    });

    it('should handle empty input to calculateRiskLevel', () => {
      expect(() => graph.calculateRiskLevel(0)).not.toThrow();
    });

    it('should handle invalid path to normalizePath', () => {
      const result = graph.normalizePath(null);
      expect(typeof result).toBe('string');
    });
  });

  describe('Consistency Checks', () => {
    it('should have consistent risk level constants', () => {
      expect(graph.RISK_LEVELS.NONE).toBe('none');
      expect(graph.RISK_LEVELS.LOW).toBe('low');
      expect(graph.RISK_LEVELS.MEDIUM).toBe('medium');
      expect(graph.RISK_LEVELS.HIGH).toBe('high');
    });

    it('should return consistent risk levels from calculateRiskLevel', () => {
      const levels = Object.values(graph.RISK_LEVELS);
      
      expect(levels).toContain(graph.calculateRiskLevel(0));
      expect(levels).toContain(graph.calculateRiskLevel(5));
      expect(levels).toContain(graph.calculateRiskLevel(15));
    });

    it('namespace functions should match direct exports', () => {
      // Ensure namespace exports are consistent with direct exports
      expect(graph.types.createEmptySystemMap).toBe(graph.createEmptySystemMap);
      expect(graph.algorithms.detectCycles).toBe(graph.detectCycles);
      expect(graph.utils.path.normalizePath).toBe(graph.normalizePath);
      expect(graph.utils.counters.countFiles).toBe(graph.countFiles);
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should support complete analysis workflow', () => {
      // Build a simple system
      const parsedFiles = {
        'src/index.js': {
          exports: [{ name: 'main', type: 'named' }],
          imports: [{ source: './utils', type: 'static' }]
        },
        'src/utils.js': {
          exports: [{ name: 'helper', type: 'named' }],
          imports: []
        }
      };
      
      const resolvedImports = {
        'src/index.js': [{ source: './utils', resolved: 'src/utils.js', type: 'static' }]
      };
      
      // Build system map
      const systemMap = graph.buildSystemMap(parsedFiles, resolvedImports);
      
      // Check for cycles
      const cycles = graph.detectCycles(systemMap.files);
      expect(Array.isArray(cycles)).toBe(true);
      
      // Calculate dependencies
      const deps = graph.calculateTransitiveDependencies('src/index.js', systemMap.files);
      expect(deps instanceof Set).toBe(true);
      
      // Analyze impact
      const impact = graph.getImpactMap('src/utils.js', systemMap.files);
      expect(impact).toHaveProperty('totalFilesAffected');
      
      // Use path utilities
      const normalized = graph.normalizePath('src\\index.js');
      expect(normalized).toBe('src/index.js');
      
      // Count elements
      const fileCount = graph.countFiles(systemMap.files);
      expect(fileCount).toBe(2);
    });

    it('should support namespace-based imports', () => {
      // Using types namespace
      const systemMap = graph.types.createEmptySystemMap();
      const fileNode = graph.types.createFileNode('/src/test.js', 'src/test.js', {});
      
      // Using algorithms namespace
      const cycles = graph.algorithms.detectCycles({});
      const risk = graph.algorithms.calculateRiskLevel(5);
      
      // Using utils namespace
      const normalized = graph.utils.path.normalizePath('src\\file.js');
      const count = graph.utils.counters.countFiles({});
      
      expect(systemMap).toBeDefined();
      expect(fileNode).toBeDefined();
      expect(Array.isArray(cycles)).toBe(true);
      expect(typeof risk).toBe('string');
      expect(typeof normalized).toBe('string');
      expect(typeof count).toBe('number');
    });
  });
});
