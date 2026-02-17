/**
 * @fileoverview Fixtures para Pattern E: Cycle/Classification
 * 
 * Datos de prueba para funciones que detectan y clasifican ciclos.
 * 
 * ESTRUCTURA CORRECTA:
 * systemMap.function_links = [
 *   { from: 'funcA', to: 'funcB' },
 *   { from: 'funcB', to: 'funcC' },
 *   { from: 'funcC', to: 'funcA' }  // Ciclo!
 * ]
 * 
 * @module tests/functional/patterns/fixtures/cycle.fixtures
 */

/**
 * SystemMap con ciclos de dependencias entre funciones
 * Ciclo: funcA → funcB → funcC → funcA
 */
export const withFunctionCycles = {
  function_links: [
    { from: 'src/utils/helpers.js:funcA', to: 'src/utils/helpers.js:funcB' },
    { from: 'src/utils/helpers.js:funcB', to: 'src/services/api.js:funcC' },
    { from: 'src/services/api.js:funcC', to: 'src/utils/helpers.js:funcA' }  // Cierra el ciclo!
  ],
  files: {
    'src/utils/helpers.js': {
      atoms: [
        { id: 'funcA', name: 'funcA', type: 'function' },
        { id: 'funcB', name: 'funcB', type: 'function' }
      ]
    },
    'src/services/api.js': {
      atoms: [
        { id: 'funcC', name: 'funcC', type: 'function' }
      ]
    }
  },
  metadata: {
    totalFiles: 2,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap SIN ciclos (árbol limpio)
 */
export const withoutCycles = {
  function_links: [
    { from: 'src/utils/logger.js:log', to: 'src/utils/logger.js:format' },
    { from: 'src/services/api.js:fetchData', to: 'src/utils/logger.js:log' },
    { from: 'src/app.js:init', to: 'src/services/api.js:fetchData' }
  ],
  files: {
    'src/utils/logger.js': {
      atoms: [
        { id: 'log', name: 'log', type: 'function' },
        { id: 'format', name: 'format', type: 'function' }
      ]
    },
    'src/services/api.js': {
      atoms: [
        { id: 'fetchData', name: 'fetchData', type: 'function' }
      ]
    },
    'src/app.js': {
      atoms: [
        { id: 'init', name: 'init', type: 'function' }
      ]
    }
  },
  metadata: {
    totalFiles: 3,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap con recursión mutua (caso especial)
 * traverseA ↔ traverseB se llaman mutuamente
 */
export const withMutualRecursion = {
  function_links: [
    { from: 'src/algorithms/graph.js:traverseA', to: 'src/algorithms/graph.js:traverseB' },
    { from: 'src/algorithms/graph.js:traverseB', to: 'src/algorithms/graph.js:traverseA' }  // Recursión mutua!
  ],
  files: {
    'src/algorithms/graph.js': {
      atoms: [
        { id: 'traverseA', name: 'traverseA', type: 'function' },
        { id: 'traverseB', name: 'traverseB', type: 'function' }
      ]
    }
  },
  metadata: {
    totalFiles: 1,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap vacío (edge case)
 */
export const emptySystemMap = {
  function_links: [],
  files: {},
  metadata: {
    totalFiles: 0,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap con funciones sin llamadas
 */
export const withIsolatedFunctions = {
  function_links: [],
  files: {
    'src/utils/math.js': {
      atoms: [
        { id: 'add', name: 'add', type: 'function' },
        { id: 'subtract', name: 'subtract', type: 'function' }
      ]
    }
  },
  metadata: {
    totalFiles: 1,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap con múltiples ciclos independientes
 * Ciclo 1: a1 → b1 → a1
 * Ciclo 2: x1 → y1 → z1 → x1
 */
export const withMultipleCycles = {
  function_links: [
    // Ciclo 1
    { from: 'src/cycle1/a.js:a1', to: 'src/cycle1/b.js:b1' },
    { from: 'src/cycle1/b.js:b1', to: 'src/cycle1/a.js:a1' },
    // Ciclo 2
    { from: 'src/cycle2/x.js:x1', to: 'src/cycle2/y.js:y1' },
    { from: 'src/cycle2/y.js:y1', to: 'src/cycle2/z.js:z1' },
    { from: 'src/cycle2/z.js:z1', to: 'src/cycle2/x.js:x1' }
  ],
  files: {
    'src/cycle1/a.js': {
      atoms: [{ id: 'a1', name: 'a1', type: 'function' }]
    },
    'src/cycle1/b.js': {
      atoms: [{ id: 'b1', name: 'b1', type: 'function' }]
    },
    'src/cycle2/x.js': {
      atoms: [{ id: 'x1', name: 'x1', type: 'function' }]
    },
    'src/cycle2/y.js': {
      atoms: [{ id: 'y1', name: 'y1', type: 'function' }]
    },
    'src/cycle2/z.js': {
      atoms: [{ id: 'z1', name: 'z1', type: 'function' }]
    }
  },
  metadata: {
    totalFiles: 5,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * Ciclo simple de 2 funciones (para tests de clasificación)
 */
export const simpleTwoFunctionCycle = {
  function_links: [
    { from: 'src/a.js:funcA', to: 'src/b.js:funcB' },
    { from: 'src/b.js:funcB', to: 'src/a.js:funcA' }
  ],
  files: {
    'src/a.js': {
      atoms: [{ id: 'funcA', name: 'funcA', type: 'function' }]
    },
    'src/b.js': {
      atoms: [{ id: 'funcB', name: 'funcB', type: 'function' }]
    }
  },
  metadata: {
    totalFiles: 2,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * Resultados esperados para validación
 */
export const expectedResults = {
  withFunctionCycles: {
    total: 1,
    hasCycles: true,
    cycles: [
      {
        length: 4,  // [A, B, C, A]
        functions: ['funcA', 'funcB', 'funcC']
      }
    ],
    classifications: [
      {
        severity: 'WARNING',  // o 'CRITICAL' dependiendo de la implementación
        category: expect.any(String),
        autoIgnore: expect.any(Boolean)
      }
    ],
    problematicCount: expect.any(Number)
  },
  
  withoutCycles: {
    total: 0,
    hasCycles: false,
    cycles: [],
    classifications: [],
    problematicCount: 0
  },
  
  withMutualRecursion: {
    total: 1,
    hasCycles: true,
    hasMutualRecursion: true,
    cycles: [
      {
        length: 3,  // [A, B, A]
        functions: ['traverseA', 'traverseB']
      }
    ],
    severity: 'CRITICAL'  // Ciclo de 2 es CRITICAL según el código
  },
  
  emptySystemMap: {
    total: 0,
    cycles: [],
    classifications: [],
    validCount: 0,
    problematicCount: 0,
    hasMutualRecursion: false
  },

  withMultipleCycles: {
    total: 2,
    hasCycles: true
  }
};

/**
 * Exportar todos los fixtures juntos
 */
export default {
  withFunctionCycles,
  withoutCycles,
  withMutualRecursion,
  emptySystemMap,
  withIsolatedFunctions,
  withMultipleCycles,
  simpleTwoFunctionCycle,
  expectedResults
};
