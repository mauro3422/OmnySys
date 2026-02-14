/**
 * Analysis Factory - Generador de suites de tests para análisis
 * 
 * Proporciona utilidades para crear tests consistentes
 * para todos los sistemas de análisis (Tier 1-3).
 */

import { describe, it, expect } from 'vitest';

/**
 * Crea un systemMap mock básico para testing
 */
export function createMockSystemMap(overrides = {}) {
  return {
    files: {},
    functions: {},
    function_links: [],
    exportIndex: {},
    metadata: {
      cyclesDetected: []
    },
    ...overrides
  };
}

/**
 * Crea un archivo mock con estructura completa
 */
export function createMockFile(path, overrides = {}) {
  return {
    path,
    imports: [],
    exports: [],
    usedBy: [],
    dependsOn: [],
    ...overrides
  };
}

/**
 * Crea una función mock
 */
export function createMockFunction(filePath, name, overrides = {}) {
  return {
    id: `${filePath}:${name}`,
    name,
    file: filePath,
    isExported: false,
    line: 1,
    ...overrides
  };
}

/**
 * Crea un link de función (llamada) mock
 */
export function createMockFunctionLink(from, to, overrides = {}) {
  return {
    from,
    to,
    type: 'call',
    ...overrides
  };
}

/**
 * Suite de tests estructurales para análisis
 * Verifica que todos los análisis retornan estructura consistente
 */
export function createAnalysisStructureSuite(analysisName, analyzeFunction, validInput) {
  describe(`${analysisName} - Structure Contract`, () => {
    it('MUST return an object', async () => {
      const result = await analyzeFunction(validInput);
      expect(result).toBeTypeOf('object');
    });

    it('MUST have a total/count field', async () => {
      const result = await analyzeFunction(validInput);
      const hasTotal = 'total' in result || 'count' in result;
      expect(hasTotal).toBe(true);
    });

    it('MUST NOT throw on empty/valid input', async () => {
      expect(async () => {
        await analyzeFunction(validInput);
      }).not.toThrow();
    });
  });
}

/**
 * Suite de tests para análisis que detectan "problemas"
 * (hotspots, orphans, circular deps, etc.)
 */
export function createDetectionAnalysisSuite(analysisName, analyzeFunction, scenarios) {
  describe(`${analysisName} - Detection Scenarios`, () => {
    for (const [scenarioName, { input, expected }] of Object.entries(scenarios)) {
      it(`should detect correctly: ${scenarioName}`, async () => {
        const result = await analyzeFunction(input);
        
        if (expected.total !== undefined) {
          expect(result.total).toBe(expected.total);
        }
        
        if (expected.hasResults !== undefined) {
          const hasItems = (result.files?.length || result.functions?.length || result.cycles?.length) > 0;
          expect(hasItems).toBe(expected.hasResults);
        }
      });
    }
  });
}

/**
 * Suite de tests para análisis con clasificación de severidad
 */
export function createSeverityClassificationSuite(analysisName, analyzeFunction, testCases) {
  describe(`${analysisName} - Severity Classification`, () => {
    for (const [testName, { input, expectedSeverity }] of Object.entries(testCases)) {
      it(`should classify severity correctly: ${testName}`, async () => {
        const result = await analyzeFunction(input);
        
        // Check for severity fields in result
        if (result.severity) {
          expect(result.severity).toBe(expectedSeverity);
        }
        
        // Check for items with severity
        const items = result.files || result.functions || result.cycles || [];
        if (items.length > 0 && expectedSeverity) {
          const hasCorrectSeverity = items.some(item => item.severity === expectedSeverity);
          expect(hasCorrectSeverity).toBe(true);
        }
      });
    }
  });
}

/**
 * Constantes para tests de análisis
 */
export const ANALYSIS_TEST_CONSTANTS = {
  SEVERITY_LEVELS: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
  CYCLE_CATEGORIES: ['VALID_PATTERN', 'CRITICAL_ISSUE', 'REQUIRES_REVIEW', 'COUPLING_ISSUE'],
  ORPHAN_TYPES: ['ENTRY_POINT', 'DEAD_CODE'],
  HOTSPOT_THRESHOLDS: {
    CRITICAL: 15,
    HIGH: 10,
    MEDIUM: 5
  }
};

/**
 * Builders para construir escenarios de prueba complejos
 */
export const ScenarioBuilder = {
  /**
   * Crea un escenario con hotspot (función llamada muchas veces)
   */
  hotspot: (callCount, options = {}) => {
    const targetFunc = 'utils/helpers.js:formatDate';
    const links = [];
    
    for (let i = 0; i < callCount; i++) {
      links.push(createMockFunctionLink(
        `components/Component${i}.js:render`,
        targetFunc
      ));
    }
    
    return createMockSystemMap({
      function_links: links,
      functions: {
        'utils/helpers.js': [createMockFunction('utils/helpers.js', 'formatDate', { isExported: true })]
      }
    });
  },

  /**
   * Crea un escenario con archivos huérfanos
   */
  orphans: (orphanCount, entryPointCount = 0) => {
    const files = {};
    
    // Orphan files (no deps)
    for (let i = 0; i < orphanCount; i++) {
      const path = `orphan${i}.js`;
      files[path] = createMockFile(path, { usedBy: [], dependsOn: [] });
    }
    
    // Entry points (no deps but named like entry points)
    for (let i = 0; i < entryPointCount; i++) {
      const path = `main${i}.js`;
      files[path] = createMockFile(path, { usedBy: [], dependsOn: [] });
    }
    
    return createMockSystemMap({ files });
  },

  /**
   * Crea un escenario con ciclos de funciones
   */
  functionCycles: (cycles) => {
    const links = [];
    
    for (const cycle of cycles) {
      // cycle = ['A', 'B', 'C'] means A->B, B->C, C->A
      for (let i = 0; i < cycle.length; i++) {
        const from = cycle[i];
        const to = cycle[(i + 1) % cycle.length];
        links.push(createMockFunctionLink(from, to));
      }
    }
    
    return createMockSystemMap({ function_links: links });
  },

  /**
   * Crea un escenario con imports circulares
   */
  importCycles: (cycles) => {
    return createMockSystemMap({
      metadata: {
        cyclesDetected: cycles
      }
    });
  }
};
