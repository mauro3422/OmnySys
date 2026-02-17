/**
 * @fileoverview Cross-Layer Integration Factory
 * 
 * Factory para tests de integración entre Layer A y Layer B.
 * Proporciona fixtures y builders para probar el flujo completo.
 * 
 * @module tests/factories/cross-layer.factory
 */

/**
 * Builder para crear proyectos de prueba con archivos de código
 */
export class TestProjectBuilder {
  constructor() {
    this.files = new Map();
    this.metadata = new Map();
    this.connections = [];
  }

  addFile(filePath, code, options = {}) {
    this.files.set(filePath, {
      code,
      imports: options.imports || [],
      exports: options.exports || [],
      usedBy: options.usedBy || [],
      semanticAnalysis: options.semanticAnalysis || {}
    });
    return this;
  }

  withLocalStorage(filePath, reads = [], writes = []) {
    const file = this.files.get(filePath);
    if (file) {
      file.semanticAnalysis.sharedState = {
        reads: reads,
        writes: writes,
        readProperties: reads,
        writeProperties: writes
      };
    }
    return this;
  }

  withEvents(filePath, emitters = [], listeners = []) {
    const file = this.files.get(filePath);
    if (file) {
      file.semanticAnalysis.eventPatterns = {
        eventEmitters: emitters,
        eventListeners: listeners
      };
    }
    return this;
  }

  withGlobalAccess(filePath, properties = []) {
    const file = this.files.get(filePath);
    if (file) {
      file.semanticAnalysis.sideEffects = {
        hasGlobalAccess: true,
        globalProperties: properties
      };
    }
    return this;
  }

  addConnection(source, target, type, via, confidence = 1.0) {
    this.connections.push({
      sourceFile: source,
      targetFile: target,
      type,
      via,
      confidence,
      detectedBy: 'static-extractor'
    });
    return this;
  }

  build() {
    const systemMap = {
      files: {},
      connections: this.connections,
      metadata: {
        analyzedAt: new Date().toISOString(),
        totalFiles: this.files.size
      }
    };

    this.files.forEach((data, path) => {
      systemMap.files[path] = {
        filePath: path,
        imports: data.imports,
        exports: data.exports,
        usedBy: [],
        semanticAnalysis: data.semanticAnalysis
      };
    });

    return systemMap;
  }

  static create() {
    return new TestProjectBuilder();
  }
}

/**
 * Crea un proyecto de prueba con archivos que comparten localStorage
 */
export function createSharedLocalStorageProject() {
  return TestProjectBuilder.create()
    .addFile('src/auth/login.js', `localStorage.setItem('token', token);`, {
      semanticAnalysis: {
        sharedState: { writes: ['token'], reads: [] }
      }
    })
    .addFile('src/auth/logout.js', `localStorage.removeItem('token');`, {
      semanticAnalysis: {
        sharedState: { writes: ['token'], reads: [] }
      }
    })
    .addFile('src/api/client.js', `const token = localStorage.getItem('token');`, {
      semanticAnalysis: {
        sharedState: { writes: [], reads: ['token'] }
      }
    })
    .addConnection('src/auth/login.js', 'src/api/client.js', 'localStorage', 'token')
    .addConnection('src/auth/logout.js', 'src/api/client.js', 'localStorage', 'token')
    .build();
}

/**
 * Crea un proyecto de prueba con eventos compartidos
 */
export function createSharedEventsProject() {
  return TestProjectBuilder.create()
    .addFile('src/events/publisher.js', `emit('user:login', data);`, {
      semanticAnalysis: {
        eventPatterns: { eventEmitters: ['user:login'], eventListeners: [] }
      }
    })
    .addFile('src/events/subscriber.js', `on('user:login', handler);`, {
      semanticAnalysis: {
        eventPatterns: { eventEmitters: [], eventListeners: ['user:login'] }
      }
    })
    .addConnection('src/events/publisher.js', 'src/events/subscriber.js', 'eventListener', 'user:login')
    .build();
}

/**
 * Crea un proyecto con orphans detectables
 */
export function createOrphanProject() {
  return TestProjectBuilder.create()
    .addFile('src/orphan/unused.js', `window.config = { debug: true };`, {
      imports: [],
      exports: [],
      semanticAnalysis: {
        sideEffects: { hasGlobalAccess: true },
        sharedState: { writes: ['config'], reads: [] }
      }
    })
    .addFile('src/orphan/events.js', `emit('orphan-event');`, {
      imports: [],
      exports: [],
      semanticAnalysis: {
        eventPatterns: { eventEmitters: ['orphan-event'], eventListeners: [] }
      }
    })
    .build();
}

/**
 * Crea un proyecto god-object
 */
export function createGodObjectProject() {
  const builder = TestProjectBuilder.create();
  
  const manyExports = Array(20).fill(0).map((_, i) => `export${i}`);
  const manyImports = Array(15).fill(0).map((_, i) => `./module${i}`);
  const manyDependents = Array(25).fill(0).map((_, i) => `src/consumer${i}.js`);
  
  builder.addFile('src/god-object.js', `// God object with many exports`, {
    imports: manyImports.map(m => ({ source: m })),
    exports: manyExports.map(e => ({ name: e })),
    usedBy: manyDependents,
    semanticAnalysis: {}
  });
  
  manyImports.forEach((mod, i) => {
    builder.addFile(`src/module${i}.js`, `// Module ${i}`, {
      exports: [`func${i}`]
    });
  });
  
  return builder.build();
}

/**
 * Datos de prueba estandarizados para cross-layer tests
 */
export const CROSS_LAYER_FIXTURES = {
  simpleProject: () => TestProjectBuilder.create()
    .addFile('src/index.js', `export { foo } from './utils';`)
    .addFile('src/utils.js', `export const foo = 1;`)
    .build(),

  localStorageProject: createSharedLocalStorageProject,
  eventsProject: createSharedEventsProject,
  orphanProject: createOrphanProject,
  godObjectProject: createGodObjectProject
};

/**
 * Verifica que el output de Layer A es compatible con Layer B
 */
export function validateLayerAOutput(systemMap) {
  const errors = [];
  
  if (!systemMap.files || typeof systemMap.files !== 'object') {
    errors.push('Missing or invalid files object');
  }
  
  if (!Array.isArray(systemMap.connections)) {
    errors.push('Missing or invalid connections array');
  }
  
  Object.entries(systemMap.files || {}).forEach(([path, file]) => {
    if (!file.filePath) {
      errors.push(`File ${path} missing filePath`);
    }
    if (!Array.isArray(file.imports)) {
      errors.push(`File ${path} missing imports array`);
    }
    if (!Array.isArray(file.exports)) {
      errors.push(`File ${path} missing exports array`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Verifica que Layer B puede procesar el output de Layer A
 */
export function validateLayerBInput(systemMap) {
  const errors = [];
  
  Object.entries(systemMap.files || {}).forEach(([path, file]) => {
    if (!file.semanticAnalysis) {
      errors.push(`File ${path} missing semanticAnalysis`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    canProcess: errors.length === 0
  };
}
