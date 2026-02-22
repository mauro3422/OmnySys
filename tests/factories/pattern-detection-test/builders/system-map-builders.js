/**
 * @fileoverview System Map Builders
 * 
 * Builders for creating system map test fixtures.
 * 
 * @module tests/factories/pattern-detection-test/builders/system-map-builders
 */

/**
 * Create a minimal valid system map
 */
export function createMinimalSystemMap(overrides = {}) {
  return {
    files: {},
    functions: {},
    function_links: [],
    objectExports: {},
    imports: {},
    exports: {},
    ...overrides
  };
}

/**
 * Create a complete system map with various patterns
 */
export function createComplexSystemMap(overrides = {}) {
  return {
    files: {
      'src/services/userService.js': {
        imports: [
          { source: './db', specifiers: [{ imported: 'db' }], line: 1 },
          { source: './utils', specifiers: [{ imported: 'formatUser' }], line: 2 }
        ],
        usedBy: ['src/controllers/userController.js', 'src/api/routes.js'],
        dependsOn: ['./db', './utils']
      },
      'src/services/orderService.js': {
        imports: [
          { source: './db', specifiers: [{ imported: 'db' }], line: 1 },
          { source: './userService', specifiers: [{ imported: 'getUser' }], line: 2 },
          { source: './payment', specifiers: [{ imported: 'processPayment' }], line: 3 },
          { source: './inventory', specifiers: [{ imported: 'checkStock' }], line: 4 }
        ],
        usedBy: ['src/controllers/orderController.js'],
        dependsOn: ['./db', './userService', './payment', './inventory']
      },
      'src/utils/helpers.js': {
        imports: [],
        usedBy: ['src/services/userService.js', 'src/services/orderService.js'],
        dependsOn: []
      },
      'src/config/database.js': {
        imports: [],
        usedBy: ['src/services/userService.js', 'src/services/orderService.js', 'src/models/index.js'],
        dependsOn: []
      }
    },
    functions: {
      'src/services/userService.js::getUser': {
        name: 'getUser',
        line: 10,
        isAsync: true,
        hasSideEffects: true,
        complexity: 8
      },
      'src/services/userService.js::updateUser': {
        name: 'updateUser',
        line: 25,
        isAsync: true,
        hasSideEffects: true,
        complexity: 12
      },
      'src/utils/helpers.js::formatUser': {
        name: 'formatUser',
        line: 5,
        isAsync: false,
        hasSideEffects: false,
        complexity: 3
      },
      'src/utils/helpers.js::validateEmail': {
        name: 'validateEmail',
        line: 15,
        isAsync: false,
        hasSideEffects: false,
        complexity: 4
      }
    },
    function_links: [
      { from: 'src/controllers/userController.js::getUserHandler', to: 'src/services/userService.js::getUser', fromFile: 'src/controllers/userController.js', toFile: 'src/services/userService.js', line: 20 },
      { from: 'src/controllers/userController.js::updateHandler', to: 'src/services/userService.js::updateUser', fromFile: 'src/controllers/userController.js', toFile: 'src/services/userService.js', line: 35 },
      { from: 'src/api/routes.js::setupRoutes', to: 'src/services/userService.js::getUser', fromFile: 'src/api/routes.js', toFile: 'src/services/userService.js', line: 10 },
      { from: 'src/services/userService.js::getUser', to: 'src/utils/helpers.js::formatUser', fromFile: 'src/services/userService.js', toFile: 'src/utils/helpers.js', line: 12 },
      { from: 'src/services/userService.js::updateUser', to: 'src/utils/helpers.js::validateEmail', fromFile: 'src/services/userService.js', toFile: 'src/utils/helpers.js', line: 28 }
    ],
    objectExports: {
      'src/config/settings.js': [
        { name: 'CONFIG', line: 1, isMutable: false, objectType: 'enum', riskLevel: 'low' },
        { name: 'userStore', line: 10, isMutable: true, propertyDetails: [{ risk: 'high' }] },
        { name: 'appState', line: 20, isMutable: true, propertyDetails: [{ risk: 'high' }, { risk: 'high' }] }
      ],
      'src/utils/constants.js': [
        { name: 'DEFAULTS', line: 1, isMutable: false, objectType: 'enum', riskLevel: 'low' }
      ]
    },
    imports: {
      'src/services/userService.js': [
        { source: './db', specifiers: [{ imported: 'db' }], line: 1 },
        { source: './utils', specifiers: [{ imported: 'formatUser' }], line: 2 }
      ]
    },
    exports: {
      'src/services/userService.js': [
        { name: 'getUser', line: 10 },
        { name: 'updateUser', line: 25 },
        { name: 'deleteUser', line: 40 }
      ],
      'src/utils/helpers.js': [
        { name: 'formatUser', line: 5 },
        { name: 'validateEmail', line: 15 }
      ]
    },
    ...overrides
  };
}

/**
 * Create a system map with hotspot patterns
 */
export function createHotspotsSystemMap() {
  const links = [];
  const functions = {};
  
  // Create a function with many callers (hotspot)
  for (let i = 0; i < 25; i++) {
    links.push({
      from: `src/controllers/controller${i}.js::handler`,
      to: 'src/services/businessLogic.js::processData',
      fromFile: `src/controllers/controller${i}.js`,
      toFile: 'src/services/businessLogic.js',
      line: 10
    });
  }

  functions['src/services/businessLogic.js::processData'] = {
    name: 'processData',
    line: 15,
    isAsync: true,
    hasSideEffects: true,
    complexity: 15
  };

  return createComplexSystemMap({
    function_links: [
      ...createComplexSystemMap().function_links,
      ...links
    ],
    functions: {
      ...createComplexSystemMap().functions,
      ...functions
    }
  });
}

/**
 * Create a system map with deep chain patterns
 */
export function createDeepChainsSystemMap() {
  const links = [];
  const chainLength = 12;
  
  // Create a deep chain
  for (let i = 0; i < chainLength; i++) {
    links.push({
      from: `src/chain/level${i}.js::func`,
      to: `src/chain/level${i + 1}.js::func`,
      fromFile: `src/chain/level${i}.js`,
      toFile: `src/chain/level${i + 1}.js`,
      line: i + 1
    });
  }

  return createComplexSystemMap({
    function_links: [
      ...createComplexSystemMap().function_links,
      ...links
    ]
  });
}

/**
 * Create a system map with coupling patterns
 */
export function createCouplingSystemMap() {
  const files = {};
  
  // Create a god object with many imports and dependents
  files['src/core/godObject.js'] = {
    imports: Array(30).fill(null).map((_, i) => ({ 
      source: `../module${i}`, 
      specifiers: [{ imported: `func${i}` }], 
      line: i + 1 
    })),
    usedBy: Array(20).fill(null).map((_, i) => `src/consumers/consumer${i}.js`),
    dependsOn: Array(30).fill(null).map((_, i) => `../module${i}`)
  };

  return createComplexSystemMap({ files });
}

/**
 * Create a system map with shared objects patterns
 */
export function createSharedObjectsSystemMap() {
  const files = {};
  const objectExports = {};
  
  // Create objects with many usages
  objectExports['src/state/store.js'] = [
    { name: 'globalStore', line: 1, isMutable: true, propertyDetails: [{ risk: 'high' }, { risk: 'high' }] },
    { name: 'userCache', line: 20, isMutable: true, propertyDetails: [{ risk: 'medium' }] }
  ];

  // Create files that import these objects
  for (let i = 0; i < 15; i++) {
    files[`src/components/Component${i}.js`] = {
      imports: [
        { source: '../state/store', specifiers: [{ imported: 'globalStore' }], line: 1 },
        { source: '../state/store', specifiers: [{ imported: 'userCache' }], line: 2 }
      ],
      usedBy: [],
      dependsOn: ['../state/store']
    };
  }

  return createComplexSystemMap({ files, objectExports });
}

/**
 * Create a system map with unused exports
 */
export function createUnusedExportsSystemMap() {
  const exports = {
    'src/utils/index.js': [
      { name: 'usedHelper', line: 1 },
      { name: 'unusedHelper1', line: 5 },
      { name: 'unusedHelper2', line: 10 },
      { name: 'unusedHelper3', line: 15 }
    ]
  };

  const files = {
    'src/components/App.js': {
      imports: [
        { source: '../utils', specifiers: [{ imported: 'usedHelper' }], line: 1 }
      ],
      usedBy: [],
      dependsOn: ['../utils']
    }
  };

  return createComplexSystemMap({ exports, files });
}
