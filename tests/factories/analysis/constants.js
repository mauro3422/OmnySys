/**
 * @fileoverview Analysis Factory - Constants and Scenarios
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

