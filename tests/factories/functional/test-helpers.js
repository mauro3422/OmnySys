/**
 * @fileoverview test-helpers.js
 * 
 * Helpers para crear fixtures y mocks en tests funcionales.
 * 
 * @module tests/factories/functional/test-helpers
 */

/**
 * Helpers para crear fixtures de prueba
 */
export const fixtureHelpers = {
  /**
   * Crea un systemMap mínimo para tests
   */
  createMinimalSystemMap(overrides = {}) {
    return {
      files: {},
      metadata: { totalFiles: 0 },
      ...overrides
    };
  },

  /**
   * Crea un archivo simulado con átomos
   */
  createFileWithAtoms(filePath, atoms = []) {
    return {
      [filePath]: {
        atoms,
        metadata: { atomCount: atoms.length }
      }
    };
  },

  /**
   * Crea un átomo de función simulado
   */
  createFunctionAtom(name, calls = [], overrides = {}) {
    return {
      id: `${name}-id`,
      name,
      type: 'function',
      calls,
      ...overrides
    };
  }
};

/**
 * Helpers para mocks
 */
export const mockHelpers = {
  /**
   * Crea un mock de filesystem básico
   */
  createMockFS(options = {}) {
    const files = new Map();
    
    return {
      writeFile: async (path, data) => {
        files.set(path, data);
        return Promise.resolve();
      },
      
      readFile: async (path) => {
        if (files.has(path)) {
          return Promise.resolve(files.get(path));
        }
        throw new Error(`ENOENT: ${path}`);
      },
      
      exists: async (path) => {
        return Promise.resolve(files.has(path));
      },
      
      mkdir: async () => Promise.resolve(),
      
      // Helper para tests
      _files: files,
      _getWrittenFiles: () => Array.from(files.keys())
    };
  },

  /**
   * Crea un mock de path
   */
  createMockPath() {
    return {
      join: (...args) => args.join('/'),
      dirname: (p) => p.split('/').slice(0, -1).join('/'),
      basename: (p) => p.split('/').pop()
    };
  }
};
