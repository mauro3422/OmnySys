/**
 * @fileoverview Fixtures para Pattern B: File-Grouped
 * 
 * Datos de prueba para funciones que agrupan resultados por archivo:
 * - findUnusedExports
 * - findUnusedImports
 * 
 * ESTRUCTURA CORRECTA (según unused-exports.js):
 * systemMap.files = {
 *   'src/file.js': {
 *     functions: [{ name: 'func', isExported: true, line: 10 }],
 *     imports: [{ source: './other', specifiers: [...] }]
 *   }
 * }
 * systemMap.function_links = [{ from: 'file1:func1', to: 'file2:func2' }]
 * 
 * @module tests/functional/patterns/fixtures/file-grouped.fixtures
 */

/**
 * SystemMap con exports sin usar
 */
export const withUnusedExports = {
  files: {
    'src/utils/helpers.js': {
      functions: [
        { name: 'formatDate', isExported: true, line: 10, id: 'src/utils/helpers.js:formatDate' },
        { name: 'parseDate', isExported: true, line: 20, id: 'src/utils/helpers.js:parseDate' },  // Sin usar!
        { name: 'validateEmail', isExported: true, line: 30, id: 'src/utils/helpers.js:validateEmail' }  // Sin usar!
      ],
      imports: [],
      exports: [
        { name: 'formatDate', used: true },
        { name: 'parseDate', used: false },
        { name: 'validateEmail', used: false }
      ]
    },
    'src/app.js': {
      functions: [
        { name: 'App', isExported: true, line: 5, id: 'src/app.js:App' }
      ],
      imports: [
        { 
          source: './utils/helpers.js',
          resolved: 'src/utils/helpers.js',
          specifiers: [{ imported: 'formatDate', local: 'formatDate' }]
        }
      ],
      exports: [{ name: 'App' }]
    }
  },
  function_links: [
    { from: 'src/app.js:init', to: 'src/utils/helpers.js:formatDate' }
  ],
  exportIndex: {},
  metadata: {
    totalFiles: 2,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap sin exports sin usar (todo se usa)
 * Estructura: math.js exporta add/subtract, calc.js las usa, app.js usa calculate
 */
export const withoutUnusedExports = {
  files: {
    'src/utils/math.js': {
      functions: [
        { name: 'add', isExported: true, line: 1, id: 'src/utils/math.js:add' },
        { name: 'subtract', isExported: true, line: 5, id: 'src/utils/math.js:subtract' }
      ],
      imports: [],
      exports: [
        { name: 'add', used: true },
        { name: 'subtract', used: true }
      ]
    },
    'src/calc.js': {
      functions: [
        { name: 'calculate', isExported: true, line: 10, id: 'src/calc.js:calculate' }
      ],
      imports: [
        {
          source: './utils/math.js',
          resolved: 'src/utils/math.js',
          specifiers: [
            { imported: 'add', local: 'add' },
            { imported: 'subtract', local: 'subtract' }
          ]
        }
      ],
      exports: [{ name: 'calculate' }]
    },
    'src/app.js': {
      functions: [
        { name: 'main', isExported: false, line: 1, id: 'src/app.js:main' }
      ],
      imports: [
        {
          source: './calc.js',
          resolved: 'src/calc.js',
          specifiers: [{ imported: 'calculate', local: 'calc' }]
        }
      ],
      exports: []
    }
  },
  function_links: [
    { from: 'src/calc.js:calculate', to: 'src/utils/math.js:add' },
    { from: 'src/calc.js:calculate', to: 'src/utils/math.js:subtract' },
    { from: 'src/app.js:main', to: 'src/calc.js:calculate' }
  ],
  exportIndex: {},
  metadata: {
    totalFiles: 3,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap vacío (edge case)
 */
export const emptySystemMap = {
  files: {},
  function_links: [],
  exportIndex: {},
  metadata: {
    totalFiles: 0,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap con barrel exports (re-exports)
 */
export const withBarrelExports = {
  files: {
    'src/utils/index.js': {
      functions: [],
      imports: [],
      exports: [
        { name: 'formatDate', reexport: true, source: './helpers.js' }
      ]
    },
    'src/utils/helpers.js': {
      functions: [
        { name: 'formatDate', isExported: true, line: 1, id: 'src/utils/helpers.js:formatDate' }
      ],
      imports: [],
      exports: [{ name: 'formatDate' }]
    },
    'src/app.js': {
      functions: [{ name: 'App', isExported: true, line: 1, id: 'src/app.js:App' }],
      imports: [
        {
          source: './utils/index.js',
          resolved: 'src/utils/index.js',
          specifiers: [{ imported: 'formatDate', local: 'formatDate' }]
        }
      ],
      exports: [{ name: 'App' }]
    }
  },
  function_links: [
    { from: 'src/app.js:App', to: 'src/utils/index.js:formatDate' }
  ],
  exportIndex: {
    'src/utils/index.js': {
      formatDate: { type: 'reexport', sourceFile: 'src/utils/helpers.js', sourceName: 'formatDate' }
    }
  },
  metadata: {
    totalFiles: 3,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap con API pública (exports intencionales)
 */
export const withPublicAPI = {
  files: {
    'src/index.js': {
      functions: [
        { name: 'createClient', isExported: true, line: 10, id: 'src/index.js:createClient' },
        { name: 'configure', isExported: true, line: 20, id: 'src/index.js:configure' }
      ],
      imports: [],
      exports: [
        { name: 'createClient' },
        { name: 'configure' }
      ]
    }
  },
  function_links: [],
  exportIndex: {},
  metadata: {
    totalFiles: 1,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * SystemMap con test files (deben ignorarse)
 */
export const withTestFiles = {
  files: {
    'src/utils/helpers.js': {
      functions: [
        { name: 'formatDate', isExported: true, line: 10, id: 'src/utils/helpers.js:formatDate' }
      ],
      imports: [],
      exports: [{ name: 'formatDate' }]
    },
    'src/utils/helpers.test.js': {
      functions: [
        { name: 'testFormatDate', isExported: true, line: 5, id: 'src/utils/helpers.test.js:testFormatDate' }
      ],
      imports: [],
      exports: [{ name: 'testFormatDate' }]
    }
  },
  function_links: [],
  exportIndex: {},
  metadata: {
    totalFiles: 2,
    analyzedAt: '2026-02-18T00:00:00Z'
  }
};

/**
 * Resultados esperados para validación
 */
export const expectedResults = {
  withUnusedExports: {
    totalUnused: 2,
    hasUnused: true,
    byFile: {
      'src/utils/helpers.js': [
        { name: 'parseDate' },
        { name: 'validateEmail' }
      ]
    }
  },
  
  withoutUnusedExports: {
    totalUnused: 0,
    hasUnused: false,
    byFile: {}
  },
  
  emptySystemMap: {
    totalUnused: 0,
    byFile: {},
    impact: 'No unused exports detected'
  },
  
  withBarrelExports: {
    totalUnused: 0,  // No debería detectar como unused porque se re-exporta
    hasUnused: false
  },
  
  withPublicAPI: {
    totalUnused: 0,  // API pública no se reporta como unused
    hasUnused: false
  }
};

/**
 * Exportar todos los fixtures juntos
 */
export default {
  withUnusedExports,
  withoutUnusedExports,
  emptySystemMap,
  withBarrelExports,
  withPublicAPI,
  withTestFiles,
  expectedResults
};
