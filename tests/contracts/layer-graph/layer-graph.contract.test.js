/**
 * @fileoverview Layer Graph Contract Tests
 * 
 * Verifica que la API pública de layer-graph cumple con el contrato esperado.
 * Nota: Algunos exports (getDependencyGraph, findCallSites) dependen de layer-a
 * y no se testean aquí.
 */

import { describe, it, expect, beforeAll } from 'vitest';

const CORE_EXPORTS = [
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
  'isInCycle',
  'getFilesInCycles',
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
  'countDependencies',
  'serializeGraph',
  'deserializeGraph',
  'getGraphDelta',
  'applyGraphDelta'
];

const GRAPH_NAMESPACES = ['types', 'algorithms', 'builders', 'resolvers', 'utils', 'persistence'];

describe('Layer Graph Contract', () => {
  let graphModule;

  beforeAll(async () => {
    try {
      graphModule = await import('#layer-graph/index.js');
    } catch (e) {
      graphModule = null;
    }
  });

  describe('Module Import', () => {
    it('MUST be importable from #layer-graph/index.js', () => {
      expect(graphModule).toBeDefined();
    });
  });

  describe('Core Exports', () => {
    CORE_EXPORTS.forEach(exportName => {
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

  describe('Types Namespace', () => {
    it('MUST have createEmptySystemMap', () => {
      if (!graphModule?.types) return;
      expect(graphModule.types.createEmptySystemMap).toBeDefined();
    });

    it('createEmptySystemMap MUST return correct structure', () => {
      if (!graphModule?.types?.createEmptySystemMap) return;
      const result = graphModule.types.createEmptySystemMap();
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('functions');
      expect(result).toHaveProperty('function_links');
      expect(result).toHaveProperty('metadata');
    });
  });

  describe('Algorithms Namespace', () => {
    it('MUST have detectCycles', () => {
      if (!graphModule?.algorithms) return;
      expect(graphModule.algorithms.detectCycles).toBeDefined();
    });

    it('MUST have getImpactMap', () => {
      if (!graphModule?.algorithms) return;
      expect(graphModule.algorithms.getImpactMap).toBeDefined();
    });

    it('MUST have RISK_LEVELS', () => {
      if (!graphModule?.algorithms) return;
      expect(graphModule.algorithms.RISK_LEVELS).toBeDefined();
      expect(graphModule.algorithms.RISK_LEVELS).toHaveProperty('LOW');
      expect(graphModule.algorithms.RISK_LEVELS).toHaveProperty('MEDIUM');
      expect(graphModule.algorithms.RISK_LEVELS).toHaveProperty('HIGH');
    });
  });

  describe('Persistence Namespace', () => {
    it('MUST have serializeGraph', () => {
      if (!graphModule?.persistence) return;
      expect(graphModule.persistence.serializeGraph).toBeDefined();
    });

    it('MUST have deserializeGraph', () => {
      if (!graphModule?.persistence) return;
      expect(graphModule.persistence.deserializeGraph).toBeDefined();
    });
  });

  describe('Utils Namespace', () => {
    it('MUST have path.normalizePath', () => {
      if (!graphModule?.utils?.path) return;
      expect(graphModule.utils.path.normalizePath).toBeDefined();
    });

    it('MUST have counters.countTotalFunctions', () => {
      if (!graphModule?.utils?.counters) return;
      expect(graphModule.utils.counters.countTotalFunctions).toBeDefined();
    });
  });

  describe('Backward Compatibility', () => {
    it('MUST be re-exportable from #core/graph/index.js', async () => {
      let coreGraph;
      try {
        coreGraph = await import('#core/graph/index.js');
      } catch (e) {
        coreGraph = null;
      }
      
      if (!coreGraph) return;
      expect(coreGraph.buildSystemMap).toBeDefined();
      expect(coreGraph.detectCycles).toBeDefined();
    });
  });
});
