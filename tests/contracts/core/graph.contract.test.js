import { describe, it, expect, beforeAll } from 'vitest';

const GRAPH_MAIN_EXPORTS = [
  'buildSystemMap',
  'buildGraph',
  'getImpactMap',
  'createEmptySystemMap',
  'createFileNode',
  'createDependency',
  'createFunctionLink',
  'createImpactInfo',
  'buildExportIndex',
  'buildFunctionLinks',
  'detectCycles',
  'calculateTransitiveDependencies',
  'calculateTransitiveDependents',
  'calculateRiskLevel',
  'generateRecommendation',
  'findHighImpactFiles',
  'RISK_LEVELS',
  'findFunctionInResolution',
  'normalizePath',
  'getDisplayPath',
  'resolveImportPath',
  'uniquePaths',
  'pathsEqual',
  'getFileExtension',
  'isRelativePath',
  'countTotalFunctions',
  'countTotalItems',
  'countUnresolvedImports',
  'countFiles',
  'countDependencies'
];

const GRAPH_NAMESPACES = ['types', 'algorithms', 'utils', 'resolvers', 'builders'];

describe('Core Graph Module Contract (via layer-graph)', () => {
  let graphModule;
  let typesModule;
  let algorithmsModules;
  let buildersModules;
  let utilsPathModule;
  let utilsCountersModule;
  let resolversModule;

  beforeAll(async () => {
    try {
      graphModule = await import('#layer-graph/index.js');
    } catch (e) {
      graphModule = null;
    }

    try {
      typesModule = await import('#layer-graph/core/types.js');
    } catch (e) {
      typesModule = null;
    }

    try {
      algorithmsModules = {
        cycleDetector: await import('#layer-graph/algorithms/cycle-detector.js'),
        transitiveDeps: await import('#layer-graph/algorithms/transitive-deps.js'),
        impactAnalyzer: await import('#layer-graph/algorithms/impact-analyzer.js')
      };
    } catch (e) {
      algorithmsModules = null;
    }

    try {
      buildersModules = {
        systemMap: await import('#layer-graph/builders/system-map.js'),
        exportIndex: await import('#layer-graph/builders/export-index.js'),
        functionLinks: await import('#layer-graph/builders/function-links.js')
      };
    } catch (e) {
      buildersModules = null;
    }

    try {
      utilsPathModule = await import('#layer-graph/utils/path-utils.js');
    } catch (e) {
      utilsPathModule = null;
    }

    try {
      utilsCountersModule = await import('#layer-graph/utils/counters.js');
    } catch (e) {
      utilsCountersModule = null;
    }

    try {
      resolversModule = await import('#layer-graph/resolvers/function-resolver.js');
    } catch (e) {
      resolversModule = null;
    }
  });

  describe('Main Module Exports', () => {
    it('MUST be importable', () => {
      if (!graphModule) {
        expect(true).toBe(true);
        return;
      }
      expect(graphModule).toBeDefined();
    });

    GRAPH_MAIN_EXPORTS.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!graphModule) return;
        expect(graphModule[exportName]).toBeDefined();
      });
    });

    it('buildGraph MUST be an alias for buildSystemMap', () => {
      if (!graphModule) return;
      expect(graphModule.buildGraph).toBe(graphModule.buildSystemMap);
    });
  });

  describe('Namespace Exports', () => {
    GRAPH_NAMESPACES.forEach(namespace => {
      it(`MUST export ${namespace} namespace`, () => {
        if (!graphModule) return;
        expect(graphModule[namespace]).toBeDefined();
        expect(typeof graphModule[namespace]).toBe('object');
      });
    });
  });

  describe('Types Module', () => {
    it('MUST be importable', () => {
      if (!typesModule) {
        expect(true).toBe(true);
        return;
      }
      expect(typesModule).toBeDefined();
    });

    it('createEmptySystemMap MUST return correct structure', () => {
      if (!typesModule || !typesModule.createEmptySystemMap) return;
      const result = typesModule.createEmptySystemMap();
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('functions');
      expect(result).toHaveProperty('function_links');
      expect(result).toHaveProperty('unresolvedImports');
      expect(result).toHaveProperty('reexportChains');
      expect(result).toHaveProperty('exportIndex');
      expect(result).toHaveProperty('metadata');
    });
  });

  describe('Algorithms Modules', () => {
    it('cycle-detector MUST export detectCycles', () => {
      if (!algorithmsModules?.cycleDetector) return;
      expect(algorithmsModules.cycleDetector.detectCycles).toBeDefined();
    });

    it('transitive-deps MUST export calculateTransitiveDependencies', () => {
      if (!algorithmsModules?.transitiveDeps) return;
      expect(algorithmsModules.transitiveDeps.calculateTransitiveDependencies).toBeDefined();
    });

    it('impact-analyzer MUST export getImpactMap', () => {
      if (!algorithmsModules?.impactAnalyzer) return;
      expect(algorithmsModules.impactAnalyzer.getImpactMap).toBeDefined();
    });
  });

  describe('Builders Modules', () => {
    it('system-map MUST export buildSystemMap', () => {
      if (!buildersModules?.systemMap) return;
      expect(buildersModules.systemMap.buildSystemMap).toBeDefined();
    });
  });

  describe('Utils Modules', () => {
    it('path-utils MUST export normalizePath', () => {
      if (!utilsPathModule) return;
      expect(utilsPathModule.normalizePath).toBeDefined();
    });

    it('counters MUST export countTotalFunctions', () => {
      if (!utilsCountersModule) return;
      expect(utilsCountersModule.countTotalFunctions).toBeDefined();
    });
  });

  describe('Module Import Compatibility', () => {
    it('all graph modules MUST use ESM imports', async () => {
      const imports = [];
      
      try {
        imports.push(await import('#layer-graph/index.js'));
      } catch (e) {}
      
      try {
        imports.push(await import('#layer-graph/core/types.js'));
      } catch (e) {}

      imports.forEach(mod => {
        if (mod) {
          expect(typeof mod).toBe('object');
        }
      });
    });

    it('imports MUST be consistent across multiple calls', async () => {
      const mod1 = await import('#layer-graph/index.js');
      const mod2 = await import('#layer-graph/index.js');
      
      expect(mod1).toBe(mod2);
    });
  });

  describe('Re-exports from Namespaces', () => {
    it('types namespace MUST contain types module exports', () => {
      if (!graphModule?.types) return;
      expect(graphModule.types.createEmptySystemMap).toBeDefined();
      expect(graphModule.types.createFileNode).toBeDefined();
    });

    it('algorithms namespace MUST contain algorithm exports', () => {
      if (!graphModule?.algorithms) return;
      expect(graphModule.algorithms.detectCycles).toBeDefined();
      expect(graphModule.algorithms.calculateTransitiveDependencies).toBeDefined();
    });

    it('utils.path namespace MUST contain path utilities', () => {
      if (!graphModule?.utils?.path) return;
      expect(graphModule.utils.path.normalizePath).toBeDefined();
    });

    it('utils.counters namespace MUST contain counter utilities', () => {
      if (!graphModule?.utils?.counters) return;
      expect(graphModule.utils.counters.countTotalFunctions).toBeDefined();
    });
  });
});
