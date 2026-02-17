/**
 * @fileoverview Fixtures para Pattern A: List Results
 * 
 * Datos de prueba para funciones que retornan listas:
 * - findHotspots (requiere >= 5 callers por función)
 * - detectSideEffectMarkers
 * 
 * ESTRUCTURA CORRECTA:
 * findHotspots usa systemMap.function_links para contar callers
 * Necesita >= 5 links apuntando a la misma función
 * 
 * @module tests/functional/patterns/fixtures/list-results.fixtures
 */

/**
 * SystemMap con hotspots (funciones con muchos callers)
 * Requiere >= 5 links apuntando a la misma función
 */
export const withHotspots = {
  files: {
    'src/utils/logger.js': {
      atoms: [{ name: 'log', type: 'function' }],
      imports: [],
      exports: ['log']
    },
    'src/utils/parser.js': {
      atoms: [{ name: 'parse', type: 'function' }],
      imports: [],
      exports: ['parse']
    }
  },
  // Muchos links apuntando a las mismas funciones = hotspots
  function_links: [
    // 5 links apuntando a logger.js:log (>= 5 = hotspot)
    { from: 'src/app.js:init', to: 'src/utils/logger.js:log' },
    { from: 'src/api.js:fetch', to: 'src/utils/logger.js:log' },
    { from: 'src/db.js:query', to: 'src/utils/logger.js:log' },
    { from: 'src/auth.js:login', to: 'src/utils/logger.js:log' },
    { from: 'src/middleware.js:handle', to: 'src/utils/logger.js:log' },
    // 3 links a parser.js:parse (< 5 = no hotspot)
    { from: 'src/app.js:process', to: 'src/utils/parser.js:parse' },
    { from: 'src/api.js:transform', to: 'src/utils/parser.js:parse' },
    { from: 'src/db.js:format', to: 'src/utils/parser.js:parse' }
  ],
  metadata: {
    totalFiles: 2,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap sin hotspots (menos de 5 callers por función)
 */
export const withoutHotspots = {
  files: {
    'src/utils/helpers.js': {
      atoms: [{ name: 'format', type: 'function' }],
      imports: [],
      exports: ['format']
    }
  },
  // Solo 3 links (< 5 = no hotspot)
  function_links: [
    { from: 'src/app.js:init', to: 'src/utils/helpers.js:format' },
    { from: 'src/api.js:fetch', to: 'src/utils/helpers.js:format' },
    { from: 'src/db.js:query', to: 'src/utils/helpers.js:format' }
  ],
  metadata: {
    totalFiles: 1,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap con side effects (usa estructura de atoms)
 */
export const withSideEffects = {
  files: {
    'src/store/actions.js': {
      atoms: [
        { 
          name: 'updateState', 
          type: 'function',
          sideEffects: ['localStorage.setItem', 'window.appState']
        },
        { 
          name: 'resetState', 
          type: 'function',
          sideEffects: ['localStorage.clear']
        }
      ],
      imports: [],
      exports: ['updateState', 'resetState']
    }
  },
  function_links: [],
  metadata: {
    totalFiles: 1,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap sin side effects
 */
export const withoutSideEffects = {
  files: {
    'src/utils/math.js': {
      atoms: [
        { name: 'add', type: 'function', sideEffects: [] },
        { name: 'multiply', type: 'function', sideEffects: [] }
      ],
      imports: [],
      exports: ['add', 'multiply']
    }
  },
  function_links: [],
  metadata: {
    totalFiles: 1,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap vacío
 */
export const emptySystemMap = {
  files: {},
  function_links: [],
  metadata: {
    totalFiles: 0,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap con muchos hotspots (caso extremo)
 */
export const withManyHotspots = {
  files: {
    'src/utils/logger.js': {
      atoms: [{ name: 'log', type: 'function' }],
      imports: [],
      exports: ['log']
    },
    'src/utils/parser.js': {
      atoms: [{ name: 'parse', type: 'function' }],
      imports: [],
      exports: ['parse']
    }
  },
  // 10 links a logger.js:log (>= 5 = CRITICAL hotspot)
  // 7 links a parser.js:parse (>= 5 = HIGH hotspot)
  function_links: [
    { from: 'src/a.js:a', to: 'src/utils/logger.js:log' },
    { from: 'src/b.js:b', to: 'src/utils/logger.js:log' },
    { from: 'src/c.js:c', to: 'src/utils/logger.js:log' },
    { from: 'src/d.js:d', to: 'src/utils/logger.js:log' },
    { from: 'src/e.js:e', to: 'src/utils/logger.js:log' },
    { from: 'src/f.js:f', to: 'src/utils/logger.js:log' },
    { from: 'src/g.js:g', to: 'src/utils/logger.js:log' },
    { from: 'src/h.js:h', to: 'src/utils/logger.js:log' },
    { from: 'src/i.js:i', to: 'src/utils/logger.js:log' },
    { from: 'src/j.js:j', to: 'src/utils/logger.js:log' },
    { from: 'src/x.js:x', to: 'src/utils/parser.js:parse' },
    { from: 'src/y.js:y', to: 'src/utils/parser.js:parse' },
    { from: 'src/z.js:z', to: 'src/utils/parser.js:parse' },
    { from: 'src/w.js:w', to: 'src/utils/parser.js:parse' },
    { from: 'src/v.js:v', to: 'src/utils/parser.js:parse' },
    { from: 'src/u.js:u', to: 'src/utils/parser.js:parse' },
    { from: 'src/t.js:t', to: 'src/utils/parser.js:parse' }
  ],
  metadata: {
    totalFiles: 2,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * Resultados esperados para validación
 */
export const expectedResults = {
  withHotspots: {
    total: 1,  // solo logger.js:log (>= 5 callers)
    hasHotspots: true,
    criticalCount: 0  // 5 callers = MEDIUM (10-14 = HIGH, >= 15 = CRITICAL)
  },
  
  withoutHotspots: {
    total: 0,
    hasHotspots: false
  },
  
  withSideEffects: {
    total: 2,  // depende de cómo detectSideEffectMarkers funcione
    hasSideEffects: true
  },
  
  withoutSideEffects: {
    total: 0,
    hasSideEffects: false
  },
  
  withManyHotspots: {
    total: 2,  // logger.js:log y parser.js:parse
    hasHotspots: true,
    criticalCount: 1  // logger.js:log tiene 10 callers = CRITICAL
  },
  
  emptySystemMap: {
    total: 0,
    functions: []
  }
};

/**
 * Exportar todos los fixtures juntos
 */
export default {
  withHotspots,
  withoutHotspots,
  withSideEffects,
  withoutSideEffects,
  emptySystemMap,
  withManyHotspots,
  expectedResults
};
