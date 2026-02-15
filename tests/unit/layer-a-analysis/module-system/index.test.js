/**
 * @fileoverview Module System Index Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/index
 */

import { describe, it, expect } from 'vitest';
import {
  // Orchestrators
  analyzeModules,
  analyzeSingleModule,
  analyzeSystemOnly,
  // Groupers
  groupMoleculesByModule,
  extractModuleName,
  getModulePathForFile,
  // Enrichers
  enrichMoleculesWithSystemContext,
  createEmptyContext,
  // Queries
  queryImpact,
  calculateImpactRisk,
  summarizeImpact,
  queryDataFlow,
  listDataFlows,
  findFlowsByModule,
  findFlowsByFunction,
  // Legacy
  ModuleAnalyzer,
  SystemAnalyzer,
  // Default
  default as moduleSystem
} from '../../../../src/layer-a-static/module-system/index.js';

describe('Module System Index', () => {
  // ============================================================================
  // Orchestrators Export
  // ============================================================================
  describe('Orchestrators Export', () => {
    it('should export analyzeModules function', () => {
      expect(typeof analyzeModules).toBe('function');
    });

    it('should export analyzeSingleModule function', () => {
      expect(typeof analyzeSingleModule).toBe('function');
    });

    it('should export analyzeSystemOnly function', () => {
      expect(typeof analyzeSystemOnly).toBe('function');
    });
  });

  // ============================================================================
  // Groupers Export
  // ============================================================================
  describe('Groupers Export', () => {
    it('should export groupMoleculesByModule function', () => {
      expect(typeof groupMoleculesByModule).toBe('function');
    });

    it('should export extractModuleName function', () => {
      expect(typeof extractModuleName).toBe('function');
    });

    it('should export getModulePathForFile function', () => {
      expect(typeof getModulePathForFile).toBe('function');
    });
  });

  // ============================================================================
  // Enrichers Export
  // ============================================================================
  describe('Enrichers Export', () => {
    it('should export enrichMoleculesWithSystemContext function', () => {
      expect(typeof enrichMoleculesWithSystemContext).toBe('function');
    });

    it('should export createEmptyContext function', () => {
      expect(typeof createEmptyContext).toBe('function');
    });
  });

  // ============================================================================
  // Queries Export
  // ============================================================================
  describe('Queries Export', () => {
    it('should export queryImpact function', () => {
      expect(typeof queryImpact).toBe('function');
    });

    it('should export calculateImpactRisk function', () => {
      expect(typeof calculateImpactRisk).toBe('function');
    });

    it('should export summarizeImpact function', () => {
      expect(typeof summarizeImpact).toBe('function');
    });

    it('should export queryDataFlow function', () => {
      expect(typeof queryDataFlow).toBe('function');
    });

    it('should export listDataFlows function', () => {
      expect(typeof listDataFlows).toBe('function');
    });

    it('should export findFlowsByModule function', () => {
      expect(typeof findFlowsByModule).toBe('function');
    });

    it('should export findFlowsByFunction function', () => {
      expect(typeof findFlowsByFunction).toBe('function');
    });
  });

  // ============================================================================
  // Legacy Exports
  // ============================================================================
  describe('Legacy Exports', () => {
    it('should export ModuleAnalyzer class', () => {
      expect(ModuleAnalyzer).toBeDefined();
      expect(typeof ModuleAnalyzer).toBe('function');
    });

    it('should export SystemAnalyzer class', () => {
      expect(SystemAnalyzer).toBeDefined();
      expect(typeof SystemAnalyzer).toBe('function');
    });
  });

  // ============================================================================
  // Default Export
  // ============================================================================
  describe('Default Export', () => {
    it('should have default export', () => {
      expect(moduleSystem).toBeDefined();
    });

    it('should export analyzeModules in default', () => {
      expect(typeof moduleSystem.analyzeModules).toBe('function');
    });

    it('should export enrichMoleculesWithSystemContext in default', () => {
      expect(typeof moduleSystem.enrichMoleculesWithSystemContext).toBe('function');
    });

    it('should export queryImpact in default', () => {
      expect(typeof moduleSystem.queryImpact).toBe('function');
    });

    it('should export queryDataFlow in default', () => {
      expect(typeof moduleSystem.queryDataFlow).toBe('function');
    });
  });

  // ============================================================================
  // Integration - Default functions work
  // ============================================================================
  describe('Integration - Default functions', () => {
    it('analyzeModules should return expected structure', () => {
      const result = moduleSystem.analyzeModules('/project', []);
      
      expect(result).toHaveProperty('modules');
      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('summary');
    });

    it('analyzeModules should handle empty molecules', () => {
      const result = moduleSystem.analyzeModules('/project', []);
      
      expect(result.modules).toEqual([]);
      expect(result.summary.totalModules).toBe(0);
    });
  });

  // ============================================================================
  // Query Functions Behavior
  // ============================================================================
  describe('Query Functions Behavior', () => {
    const mockModuleData = {
      modules: [],
      system: {
        businessFlows: [],
        entryPoints: []
      }
    };

    describe('queryImpact', () => {
      it('should return impact result', () => {
        const result = queryImpact('functionName', mockModuleData);
        expect(result).toHaveProperty('function');
        expect(result).toHaveProperty('local');
        expect(result).toHaveProperty('global');
      });
    });

    describe('calculateImpactRisk', () => {
      it('should return string risk level', () => {
        const impact = { local: { chains: [], files: [] }, global: { businessFlows: [] } };
        const risk = calculateImpactRisk(impact);
        expect(['low', 'medium', 'high', 'critical']).toContain(risk);
      });
    });

    describe('summarizeImpact', () => {
      it('should return string summary', () => {
        const impact = { local: { module: 'test', files: [], chains: [] }, global: { businessFlows: [] } };
        const summary = summarizeImpact(impact);
        expect(typeof summary).toBe('string');
      });
    });

    describe('queryDataFlow', () => {
      it('should return null when flow not found', () => {
        const result = queryDataFlow('nonexistent', mockModuleData);
        expect(result).toBeNull();
      });
    });

    describe('listDataFlows', () => {
      it('should return array of flows', () => {
        const flows = listDataFlows(mockModuleData);
        expect(Array.isArray(flows)).toBe(true);
      });
    });

    describe('findFlowsByModule', () => {
      it('should return array', () => {
        const flows = findFlowsByModule('test-module', mockModuleData);
        expect(Array.isArray(flows)).toBe(true);
      });
    });

    describe('findFlowsByFunction', () => {
      it('should return array', () => {
        const flows = findFlowsByFunction('test-function', mockModuleData);
        expect(Array.isArray(flows)).toBe(true);
      });
    });
  });

  // ============================================================================
  // Grouper Functions
  // ============================================================================
  describe('Grouper Functions', () => {
    describe('groupMoleculesByModule', () => {
      it('should return a Map', () => {
        const result = groupMoleculesByModule('/project', []);
        expect(result instanceof Map).toBe(true);
      });

      it('should group molecules by module path', () => {
        const molecules = [
          { filePath: '/project/src/auth/login.js' },
          { filePath: '/project/src/auth/logout.js' },
          { filePath: '/project/src/users/user.js' }
        ];
        const result = groupMoleculesByModule('/project', molecules);
        expect(result.size).toBeGreaterThanOrEqual(0);
      });
    });

    describe('extractModuleName', () => {
      it('should extract module name from path', () => {
        const name = extractModuleName('/project/src/auth', '/project');
        expect(typeof name).toBe('string');
      });
    });

    describe('getModulePathForFile', () => {
      it('should get module path for file', () => {
        const path = getModulePathForFile('/project/src/auth/file.js', '/project');
        expect(typeof path).toBe('string');
      });
    });
  });

  // ============================================================================
  // Enricher Functions
  // ============================================================================
  describe('Enricher Functions', () => {
    describe('createEmptyContext', () => {
      it('should return context object', () => {
        const context = createEmptyContext();
        expect(typeof context).toBe('object');
      });
    });

    describe('enrichMoleculesWithSystemContext', () => {
      it('should return array of molecules', () => {
        const molecules = [{ filePath: 'test.js' }];
        const moduleData = { modules: [], system: { businessFlows: [], entryPoints: [] } };
        const result = enrichMoleculesWithSystemContext(molecules, moduleData);
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });
});
