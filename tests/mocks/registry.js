/**
 * @fileoverview Mock Registry - Mocks reutilizables para tests funcionales
 * 
 * Centraliza la creación de mocks para filesystem, path, logger, etc.
 * Permite consistencia entre todos los tests funcionales.
 * 
 * @module tests/mocks/registry
 * @version 1.0.0
 */

import { vi } from 'vitest';

/**
 * Mocks para el módulo fs (filesystem)
 */
export const fsMocks = {
  /**
   * Mock de filesystem exitoso - todas las operaciones funcionan
   */
  successful() {
    const files = new Map();
    
    return {
      writeFile: vi.fn(async (path, data) => {
        files.set(path, data);
        return Promise.resolve();
      }),
      
      readFile: vi.fn(async (path, encoding) => {
        if (files.has(path)) {
          const content = files.get(path);
          return encoding === 'utf-8' ? content : Buffer.from(content);
        }
        const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
        error.code = 'ENOENT';
        throw error;
      }),
      
      access: vi.fn(async (path) => {
        if (files.has(path)) {
          return Promise.resolve();
        }
        const error = new Error(`ENOENT: no such file or directory, access '${path}'`);
        error.code = 'ENOENT';
        throw error;
      }),
      
      mkdir: vi.fn(async () => Promise.resolve()),
      
      stat: vi.fn(async (path) => {
        if (files.has(path)) {
          return {
            isFile: () => true,
            isDirectory: () => false,
            size: files.get(path).length
          };
        }
        const error = new Error(`ENOENT: no such file or directory, stat '${path}'`);
        error.code = 'ENOENT';
        throw error;
      }),
      
      // Helpers para tests
      _files: files,
      _getWrittenFiles: () => Array.from(files.keys()),
      _getFileContent: (path) => files.get(path),
      _clear: () => files.clear()
    };
  },

  /**
   * Mock de filesystem con errores - simula permisos denegados
   */
  permissionDenied() {
    return {
      writeFile: vi.fn(async () => {
        const error = new Error('EACCES: permission denied');
        error.code = 'EACCES';
        throw error;
      }),
      
      readFile: vi.fn(async () => {
        const error = new Error('EACCES: permission denied');
        error.code = 'EACCES';
        throw error;
      }),
      
      mkdir: vi.fn(async () => {
        const error = new Error('EACCES: permission denied');
        error.code = 'EACCES';
        throw error;
      }),
      
      access: vi.fn(async () => {
        const error = new Error('EACCES: permission denied');
        error.code = 'EACCES';
        throw error;
      })
    };
  },

  /**
   * Mock de filesystem con archivos pre-existentes
   */
  withExistingFiles(existingFiles = {}) {
    const files = new Map(Object.entries(existingFiles));
    
    return {
      writeFile: vi.fn(async (path, data) => {
        files.set(path, data);
        return Promise.resolve();
      }),
      
      readFile: vi.fn(async (path) => {
        if (files.has(path)) {
          return Promise.resolve(files.get(path));
        }
        const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
        error.code = 'ENOENT';
        throw error;
      }),
      
      access: vi.fn(async (path) => {
        if (files.has(path)) {
          return Promise.resolve();
        }
        const error = new Error(`ENOENT: no such file or directory, access '${path}'`);
        error.code = 'ENOENT';
        throw error;
      }),
      
      mkdir: vi.fn(async () => Promise.resolve()),
      
      stat: vi.fn(async (path) => {
        if (files.has(path)) {
          return {
            isFile: () => true,
            isDirectory: () => false,
            size: files.get(path).length,
            mtime: new Date()
          };
        }
        const error = new Error(`ENOENT: no such file or directory, stat '${path}'`);
        error.code = 'ENOENT';
        throw error;
      }),
      
      readdir: vi.fn(async (path) => {
        // Simular lectura de directorio
        const dirFiles = Array.from(files.keys())
          .filter(f => f.startsWith(path))
          .map(f => f.replace(path + '/', '').split('/')[0]);
        return Promise.resolve([...new Set(dirFiles)]);
      }),
      
      _files: files,
      _getWrittenFiles: () => Array.from(files.keys())
    };
  },

  /**
   * Mock de filesystem vacío (ningún archivo existe)
   */
  empty() {
    return {
      writeFile: vi.fn(async () => Promise.resolve()),
      
      readFile: vi.fn(async (path) => {
        const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
        error.code = 'ENOENT';
        throw error;
      }),
      
      access: vi.fn(async (path) => {
        const error = new Error(`ENOENT: no such file or directory, access '${path}'`);
        error.code = 'ENOENT';
        throw error;
      }),
      
      mkdir: vi.fn(async () => Promise.resolve()),
      
      stat: vi.fn(async (path) => {
        const error = new Error(`ENOENT: no such file or directory, stat '${path}'`);
        error.code = 'ENOENT';
        throw error;
      })
    };
  }
};

/**
 * Mocks para el módulo path
 */
export const pathMocks = {
  /**
   * Mock de path para sistemas POSIX (Linux/Mac)
   */
  posix() {
    return {
      join: vi.fn((...args) => args.join('/')),
      resolve: vi.fn((...args) => args.join('/')),
      dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/') || '/'),
      basename: vi.fn((p, ext) => {
        const name = p.split('/').pop();
        return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name;
      }),
      extname: vi.fn((p) => {
        const name = p.split('/').pop();
        const dotIndex = name.lastIndexOf('.');
        return dotIndex > 0 ? name.slice(dotIndex) : '';
      }),
      relative: vi.fn((from, to) => to.replace(from + '/', '')),
      sep: '/',
      delimiter: ':'
    };
  },

  /**
   * Mock de path para Windows
   */
  windows() {
    return {
      join: vi.fn((...args) => args.join('\\')),
      resolve: vi.fn((...args) => args.join('\\')),
      dirname: vi.fn((p) => p.split('\\').slice(0, -1).join('\\') || '\\'),
      basename: vi.fn((p, ext) => {
        const name = p.split('\\').pop();
        return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name;
      }),
      extname: vi.fn((p) => {
        const name = p.split('\\').pop();
        const dotIndex = name.lastIndexOf('.');
        return dotIndex > 0 ? name.slice(dotIndex) : '';
      }),
      relative: vi.fn((from, to) => to.replace(from + '\\', '')),
      sep: '\\',
      delimiter: ';'
    };
  }
};

/**
 * Mocks para logger
 */
export const loggerMocks = {
  /**
   * Mock silencioso - no imprime nada
   */
  silent() {
    return {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn()
    };
  },

  /**
   * Mock que captura logs para verificación
   */
  capturing() {
    const logs = {
      info: [],
      warn: [],
      error: [],
      debug: []
    };

    return {
      info: vi.fn((...args) => logs.info.push(args.join(' '))),
      warn: vi.fn((...args) => logs.warn.push(args.join(' '))),
      error: vi.fn((...args) => logs.error.push(args.join(' '))),
      debug: vi.fn((...args) => logs.debug.push(args.join(' '))),
      trace: vi.fn(),
      _logs: logs,
      _getInfo: () => logs.info,
      _getErrors: () => logs.error,
      _clear: () => {
        logs.info = [];
        logs.warn = [];
        logs.error = [];
        logs.debug = [];
      }
    };
  }
};

/**
 * Mocks para process
 */
export const processMocks = {
  /**
   * Mock de process.env
   */
  env(envVars = {}) {
    return {
      ...process.env,
      ...envVars
    };
  },

  /**
   * Mock de process.cwd()
   */
  cwd(path = '/test/project') {
    return vi.fn(() => path);
  }
};

/**
 * Registry completo - exportar todos los mocks
 */
export const mockRegistry = {
  fs: fsMocks,
  path: pathMocks,
  logger: loggerMocks,
  process: processMocks
};

export default mockRegistry;
