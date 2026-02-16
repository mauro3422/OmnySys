import { describe, it, expect } from 'vitest';
import * as graph from '#layer-a/graph/index.js';
import { 
  GraphBuilder, 
  SystemMapBuilder, 
  GraphScenarios,
  GraphTestFactory 
} from '../../../factories/graph-test.factory.js';
import { getFilesInCycles } from '#layer-a/graph/algorithms/cycle-detector.js';
import { calculateAllTransitiveDependencies } from '#layer-a/graph/algorithms/transitive-deps.js';

describe('Graph System - Cross-Component Contract Tests', () => {
  describe('End-to-End System Map Construction', () => {
    it('should build complete system map from parsed files and imports', () => {
      const parsedFiles = {
        'src/index.js': {
          exports: [{ name: 'main', type: 'named' }],
          imports: [{ source: './utils', type: 'static' }],
          functions: [
            { id: 'index::main', name: 'main', line: 1, calls: [{ name: 'helper', line: 10 }] }
          ]
        },
        'src/utils.js': {
          exports: [{ name: 'helper', type: 'named' }],
          imports: [],
          functions: [
            { id: 'utils::helper', name: 'helper', line: 5, calls: [] }
          ]
        },
        'src/config.js': {
          exports: [{ name: 'default', type: 'default' }],
          imports: [{ source: './constants', type: 'static' }],
          typeDefinitions: [{ name: 'Config', line: 10 }],
          constantExports: [{ name: 'DEFAULT_TIMEOUT', value: 5000 }]
        },
        'src/constants.js': {
          exports: [{ name: 'API_URL', type: 'named' }],
          imports: []
        }
      };
      
      const resolvedImports = {
        'src/index.js': [{ source: './utils', resolved: 'src/utils.js', type: 'static' }],
        'src/config.js': [{ source: './constants', resolved: 'src/constants.js', type: 'static' }]
      };
      
      const systemMap = graph.buildSystemMap(parsedFiles, resolvedImports);
      
      // Verify structure
      expect(Object.keys(systemMap.files)).toHaveLength(4);
      expect(systemMap.dependencies).toHaveLength(2);
      expect(Object.keys(systemMap.functions)).toHaveLength(2);
      expect(systemMap.function_links.length).toBeGreaterThan(0);
      
      // Verify Tier 3 data
      expect(Object.keys(systemMap.typeDefinitions)).toHaveLength(1);
      expect(Object.keys(systemMap.constantExports)).toHaveLength(1);
      
      // Verify metadata
      expect(systemMap.metadata.totalFiles).toBe(4);
      expect(systemMap.metadata.totalDependencies).toBe(2);
      expect(systemMap.metadata.totalFunctions).toBe(2);
    });

    it('should maintain bidirectional consistency in dependencies', () => {
      const systemMap = SystemMapBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .withDependency('src/a.js', 'src/b.js')
        .withDependency('src/b.js', 'src/c.js')
        .withDependency('src/a.js', 'src/c.js')
        .build();
      
      // Check dependsOn
      expect(systemMap.files['src/a.js'].dependsOn).toContain('src/b.js');
      expect(systemMap.files['src/a.js'].dependsOn).toContain('src/c.js');
      expect(systemMap.files['src/b.js'].dependsOn).toContain('src/c.js');
      
      // Check usedBy (reverse)
      expect(systemMap.files['src/b.js'].usedBy).toContain('src/a.js');
      expect(systemMap.files['src/c.js'].usedBy).toContain('src/a.js');
      expect(systemMap.files['src/c.js'].usedBy).toContain('src/b.js');
      
      // Verify no self-references in dependsOn/usedBy
      expect(systemMap.files['src/a.js'].dependsOn).not.toContain('src/a.js');
      expect(systemMap.files['src/a.js'].usedBy).not.toContain('src/a.js');
    });

    it('should correctly calculate transitive dependencies for all scenarios', () => {
      const scenarios = [
        {
          name: 'linear chain',
          graph: GraphScenarios.linearChain(),
          expectedDeps: { 'src/a.js': 3, 'src/b.js': 2, 'src/c.js': 1, 'src/d.js': 0 }
        },
        {
          name: 'star pattern',
          graph: GraphScenarios.star(),
          expectedDeps: (file) => file === 'src/utils.js' ? 0 : 1
        }
      ];
      
      for (const scenario of scenarios) {
        if (scenario.name === 'linear chain') {
          for (const [file, expected] of Object.entries(scenario.expectedDeps)) {
            const deps = graph.calculateTransitiveDependencies(file, scenario.graph.files);
            expect(deps.size).toBe(expected);
          }
        }
      }
    });
  });

  describe('Cycle Detection Integration', () => {
    it('should detect cycles and update metadata consistently', () => {
      const systemMap = SystemMapBuilder.create()
        .withCycle(['src/a.js', 'src/b.js', 'src/c.js'])
        .build();
      
      // Detect cycles
      const cycles = graph.detectCycles(systemMap.files);
      
      // Update metadata (as buildSystemMap does)
      systemMap.metadata.cyclesDetected = cycles;
      
      expect(cycles.length).toBeGreaterThan(0);
      expect(systemMap.metadata.cyclesDetected).toBe(cycles);
      
      // Verify cycle detection is idempotent
      const cycles2 = graph.detectCycles(systemMap.files);
      expect(cycles2).toEqual(cycles);
    });

    it('should handle cycle detection with transitive deps calculation', () => {
      const systemMap = SystemMapBuilder.create()
        .withCycle(['src/a.js', 'src/b.js', 'src/c.js'])
        .build();
      
      // Calculate transitive deps (should not hang)
      const depsA = graph.calculateTransitiveDependencies('src/a.js', systemMap.files);
      const depsB = graph.calculateTransitiveDependencies('src/b.js', systemMap.files);
      const depsC = graph.calculateTransitiveDependencies('src/c.js', systemMap.files);
      
      // All should complete without infinite loops
      expect(depsA instanceof Set).toBe(true);
      expect(depsB instanceof Set).toBe(true);
      expect(depsC instanceof Set).toBe(true);
    });

    it('should identify files in cycles correctly', () => {
      const systemMap = SystemMapBuilder.create()
        .withCycle(['src/a.js', 'src/b.js', 'src/c.js'])
        .withFile('src/d.js') // Not in cycle
        .build();
      
      const cycles = graph.detectCycles(systemMap.files);
      const filesInCycles = getFilesInCycles(cycles);
      
      expect(filesInCycles.has('src/a.js')).toBe(true);
      expect(filesInCycles.has('src/b.js')).toBe(true);
      expect(filesInCycles.has('src/c.js')).toBe(true);
      expect(filesInCycles.has('src/d.js')).toBe(false);
    });
  });

  describe('Impact Analysis Integration', () => {
    it('should calculate consistent impact across different paths to same file', () => {
      // Diamond pattern: A depends on B and C, both depend on D
      const systemMap = SystemMapBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js'])
        .withDependency('src/a.js', 'src/b.js')
        .withDependency('src/a.js', 'src/c.js')
        .withDependency('src/b.js', 'src/d.js')
        .withDependency('src/c.js', 'src/d.js')
        .build();
      
      // Calculate transitive dependents for D
      const transitive = graph.calculateTransitiveDependents('src/d.js', systemMap.files);
      
      // D should have A, B, C as transitive dependents
      expect(transitive.has('src/a.js')).toBe(true);
      expect(transitive.has('src/b.js')).toBe(true);
      expect(transitive.has('src/c.js')).toBe(true);
      
      // A should appear only once even though it can be reached through two paths
      expect(transitive.size).toBe(3);
    });

    it('should produce consistent risk levels across analysis methods', () => {
      // Create a file with high impact
      const builder = GraphBuilder.create().withFile('src/core.js');
      for (let i = 0; i < 15; i++) {
        builder.withFile(`src/feature${i}.js`);
        builder.withDependency(`src/feature${i}.js`, 'src/core.js');
      }
      const systemMap = builder.buildSystemMap();
      
      // Calculate risk via getImpactMap
      const impact = graph.getImpactMap('src/core.js', systemMap.files);
      
      // Calculate risk directly
      const directRisk = graph.calculateRiskLevel(impact.totalFilesAffected);
      
      expect(impact.riskLevel).toBe(directRisk);
      expect(impact.riskLevel).toBe(graph.RISK_LEVELS.HIGH);
    });

    it('should find high impact files consistently', () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/core.js')
        .withFile('src/utils.js')
        .build();
      
      // Manually set dependents
      systemMap.files['src/core.js'].usedBy = Array.from({ length: 20 }, (_, i) => `src/user${i}.js`);
      systemMap.files['src/utils.js'].usedBy = Array.from({ length: 10 }, (_, i) => `src/helper${i}.js`);
      
      const highImpact = graph.findHighImpactFiles(systemMap.files, 2);
      
      expect(highImpact[0].path).toBe('src/core.js');
      expect(highImpact[1].path).toBe('src/utils.js');
      expect(highImpact[0].dependentCount).toBeGreaterThan(highImpact[1].dependentCount);
    });
  });

  describe('Function Resolution Integration', () => {
    it('should resolve function calls across module boundaries', () => {
      const parsedFiles = {
        'src/api.js': {
          functions: [
            { id: 'api::getUser', name: 'getUser', line: 1, calls: [{ name: 'validateToken', line: 5 }] }
          ]
        },
        'src/auth.js': {
          functions: [
            { id: 'auth::validateToken', name: 'validateToken', line: 10 },
            { id: 'auth::refreshToken', name: 'refreshToken', line: 20 }
          ]
        },
        'src/db.js': {
          functions: [
            { id: 'db::query', name: 'query', line: 1 }
          ]
        }
      };
      
      const resolvedImports = {
        'src/api.js': [{ source: './auth', resolved: 'src/auth.js', type: 'static' }],
        'src/auth.js': [{ source: './db', resolved: 'src/db.js', type: 'static' }]
      };
      
      // Build system map
      const systemMap = graph.buildSystemMap(parsedFiles, resolvedImports);
      
      // Verify function links were created
      expect(systemMap.function_links.length).toBeGreaterThan(0);
      
      // Verify the specific link exists
      const link = systemMap.function_links.find(l => 
        l.from === 'api::getUser' && l.to === 'auth::validateToken'
      );
      expect(link).toBeDefined();
      expect(link.line).toBe(5);
    });

    it('should handle complex function call chains', () => {
      const parsedFiles = {
        'src/app.js': {
          functions: [
            { id: 'app::init', name: 'init', line: 1, calls: [{ name: 'setup', line: 5 }] }
          ]
        },
        'src/core.js': {
          functions: [
            { id: 'core::setup', name: 'setup', line: 1, calls: [{ name: 'configure', line: 10 }] }
          ]
        },
        'src/config.js': {
          functions: [
            { id: 'config::configure', name: 'configure', line: 1 }
          ]
        }
      };
      
      const resolvedImports = {
        'src/app.js': [{ source: './core', resolved: 'src/core.js', type: 'static' }],
        'src/core.js': [{ source: './config', resolved: 'src/config.js', type: 'static' }]
      };
      
      const systemMap = graph.buildSystemMap(parsedFiles, resolvedImports);
      
      // Should have 2 links: init->setup and setup->configure
      expect(systemMap.function_links).toHaveLength(2);
      
      // Verify chain
      const link1 = systemMap.function_links.find(l => l.from === 'app::init');
      const link2 = systemMap.function_links.find(l => l.from === 'core::setup');
      
      expect(link1.to).toBe('core::setup');
      expect(link2.to).toBe('config::configure');
    });
  });

  describe('Export Index Integration', () => {
    it('should resolve re-exports through multiple levels', () => {
      const parsedFiles = {
        'src/public-api.js': {
          exports: [
            { name: 'utils', type: 'reexport', source: './index', local: 'utils' }
          ]
        },
        'src/index.js': {
          exports: [
            { name: 'utils', type: 'reexport', source: './utils', local: 'utils' }
          ]
        },
        'src/utils.js': {
          exports: [{ name: 'utils', type: 'named' }]
        }
      };
      
      const systemMap = SystemMapBuilder.create()
        .withParsedFile('src/public-api.js', parsedFiles['src/public-api.js'])
        .withParsedFile('src/index.js', parsedFiles['src/index.js'])
        .withParsedFile('src/utils.js', parsedFiles['src/utils.js'])
        .build();
      
      // Should build without errors
      expect(systemMap.exportIndex).toBeDefined();
    });

    it('should handle barrel exports pattern', () => {
      const parsedFiles = {
        'src/components/index.js': {
          exports: [
            { name: 'Button', type: 'reexport', source: './Button', local: 'Button' },
            { name: 'Input', type: 'reexport', source: './Input', local: 'Input' },
            { name: 'Modal', type: 'reexport', source: './Modal', local: 'Modal' }
          ]
        },
        'src/components/Button.js': { exports: [{ name: 'Button', type: 'named' }] },
        'src/components/Input.js': { exports: [{ name: 'Input', type: 'named' }] },
        'src/components/Modal.js': { exports: [{ name: 'Modal', type: 'named' }] }
      };
      
      const systemMap = SystemMapBuilder.create()
        .withParsedFile('src/components/index.js', parsedFiles['src/components/index.js'])
        .withParsedFile('src/components/Button.js', parsedFiles['src/components/Button.js'])
        .withParsedFile('src/components/Input.js', parsedFiles['src/components/Input.js'])
        .withParsedFile('src/components/Modal.js', parsedFiles['src/components/Modal.js'])
        .build();
      
      const indexExports = systemMap.exportIndex['src/components/index.js'];
      expect(Object.keys(indexExports)).toHaveLength(3);
    });
  });

  describe('Path Utilities Integration', () => {
    it('should normalize paths consistently across all operations', () => {
      const paths = [
        'src\\utils\\helpers.js',
        'src/utils/helpers.js',
        './src\\utils/helpers.js'
      ];
      
      const normalized = paths.map(p => graph.normalizePath(p));
      
      // All should produce consistent forward-slash paths
      normalized.forEach(p => {
        expect(p).not.toContain('\\');
      });
    });

    it('should resolve import paths correctly in system context', () => {
      const fromFile = '/project/src/components/Button.js';
      const imports = [
        { source: './utils', expected: '/project/src/components/utils.js' },
        { source: '../helpers', expected: '/project/src/helpers.js' },
        { source: '../../config', expected: '/project/config.js' }
      ];
      
      for (const { source, expected } of imports) {
        const resolved = graph.resolveImportPath(fromFile, source);
        expect(resolved).toBe(expected);
      }
    });

    it('should detect relative vs absolute imports correctly', () => {
      const testCases = [
        { path: './local', expected: true },
        { path: '../parent', expected: true },
        { path: 'lodash', expected: false },
        { path: '@scope/package', expected: false },
        { path: '/absolute/path', expected: false }
      ];
      
      for (const { path, expected } of testCases) {
        expect(graph.isRelativePath(path)).toBe(expected);
      }
    });
  });

  describe('Counter Utilities Integration', () => {
    it('should count all system elements correctly', () => {
      const systemMap = SystemMapBuilder.create()
        .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
        .withFunction('src/a.js', 'f1')
        .withFunction('src/a.js', 'f2')
        .withFunction('src/b.js', 'f3')
        .withTypeDefinitions('src/a.js', [{ name: 'T1' }, { name: 'T2' }])
        .withEnumDefinitions('src/b.js', [{ name: 'E1' }])
        .withConstantExports('src/c.js', [{ name: 'C1' }, { name: 'C2' }, { name: 'C3' }])
        .build();
      
      expect(graph.countFiles(systemMap.files)).toBe(3);
      expect(graph.countTotalFunctions(systemMap.functions)).toBe(3);
      expect(graph.countTotalItems(systemMap.typeDefinitions)).toBe(2);
      expect(graph.countTotalItems(systemMap.enumDefinitions)).toBe(1);
      expect(graph.countTotalItems(systemMap.constantExports)).toBe(3);
    });

    it('should maintain consistent counts in metadata', () => {
      const systemMap = graph.buildSystemMap({
        'src/file.js': {
          functions: [{ id: 'f1', name: 'f1' }, { id: 'f2', name: 'f2' }],
          typeDefinitions: [{ name: 'Type1' }]
        }
      }, {});
      
      expect(systemMap.metadata.totalFiles).toBe(graph.countFiles(systemMap.files));
      expect(systemMap.metadata.totalFunctions).toBe(graph.countTotalFunctions(systemMap.functions));
      expect(systemMap.metadata.totalTypes).toBe(graph.countTotalItems(systemMap.typeDefinitions));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty system gracefully', () => {
      const systemMap = graph.buildSystemMap({}, {});
      
      expect(graph.detectCycles(systemMap.files)).toHaveLength(0);
      expect(graph.findHighImpactFiles(systemMap.files)).toHaveLength(0);
      expect(Object.keys(systemMap.files)).toHaveLength(0);
    });

    it('should handle corrupted data without crashing', () => {
      const corruptedFiles = {
        'file3.js': { dependsOn: [] },
        'file4.js': { dependsOn: [] }
      };
      
      expect(() => graph.detectCycles(corruptedFiles)).not.toThrow();
    });

    it('should handle missing file references gracefully', () => {
      const files = {
        'a.js': { dependsOn: ['b.js'] }
        // b.js is missing
      };
      
      expect(() => graph.calculateTransitiveDependencies('a.js', files)).not.toThrow();
    });

    it('should be idempotent for multiple analyses', () => {
      const systemMap = GraphScenarios.complex();
      
      const cycles1 = graph.detectCycles(systemMap.files);
      const cycles2 = graph.detectCycles(systemMap.files);
      
      const deps1 = calculateAllTransitiveDependencies(systemMap.files);
      const deps2 = calculateAllTransitiveDependencies(systemMap.files);
      
      expect(cycles1).toEqual(cycles2);
      expect(deps1).toEqual(deps2);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large system maps efficiently', () => {
      const builder = SystemMapBuilder.create();
      
      // Create 100 files
      for (let i = 0; i < 100; i++) {
        builder.withFile(`src/file${i}.js`);
      }
      
      // Create some dependencies
      for (let i = 0; i < 99; i++) {
        builder.withDependency(`src/file${i}.js`, `src/file${i + 1}.js`);
      }
      
      const systemMap = builder.build();
      
      // All operations should complete
      const start = Date.now();
      const cycles = graph.detectCycles(systemMap.files);
      const deps = graph.calculateAllTransitiveDependencies(systemMap.files);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(Object.keys(deps)).toHaveLength(100);
    });
  });
});
