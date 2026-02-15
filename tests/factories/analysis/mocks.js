/**
 * @fileoverview Analysis Factory - Mocks
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

