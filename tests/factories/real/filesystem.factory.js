/**
 * @fileoverview filesystem.factory.js
 * 
 * Factory REAL para crear estructuras de archivos en tests.
 * Usa el filesystem real en un directorio temporal.
 * Reemplaza mocks de fs con archivos reales.
 * 
 * @module tests/factories/real/filesystem
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../../../src/utils/logger.js';

const logger = createLogger('Test:FileSystemFactory');

/**
 * Crea un sandbox de filesystem para tests
 * Usa un directorio temporal real en lugar de mocks
 */
export class FileSystemFactory {
  constructor(baseDir = null) {
    this.baseDir = baseDir || process.env.TEST_TEMP_DIR || './test-temp';
    this.files = new Map();
    this.createdDirs = new Set();
  }

  static async create(baseDir = null) {
    const factory = new FileSystemFactory(baseDir);
    await factory.init();
    return factory;
  }

  async init() {
    // Crear directorio base si no existe
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      logger.debug(`[SANDBOX] Created: ${this.baseDir}`);
    } catch (error) {
      logger.error(`[SANDBOX ERROR] Cannot create ${this.baseDir}:`, error);
      throw error;
    }
  }

  /**
   * Crea un archivo con contenido
   */
  async createFile(filePath, content = '') {
    const fullPath = path.join(this.baseDir, filePath);
    const dir = path.dirname(fullPath);
    
    // Crear directorio si no existe
    if (!this.createdDirs.has(dir)) {
      await fs.mkdir(dir, { recursive: true });
      this.createdDirs.add(dir);
    }
    
    // Escribir archivo
    await fs.writeFile(fullPath, content, 'utf-8');
    this.files.set(filePath, { content, fullPath });
    
    logger.debug(`[FILE CREATED] ${filePath}`);
    return fullPath;
  }

  /**
   * Crea multiples archivos
   */
  async createFiles(filesMap) {
    const results = {};
    for (const [filePath, content] of Object.entries(filesMap)) {
      results[filePath] = await this.createFile(filePath, content);
    }
    return results;
  }

  /**
   * Crea un proyecto de ejemplo
   */
  async createProject(projectName, files) {
    const projectDir = path.join(this.baseDir, projectName);
    await fs.mkdir(projectDir, { recursive: true });
    
    const created = {};
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(projectDir, filePath);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      created[filePath] = fullPath;
    }
    
    logger.debug(`[PROJECT CREATED] ${projectName} with ${Object.keys(files).length} files`);
    return { path: projectDir, files: created };
  }

  /**
   * Lee un archivo
   */
  async readFile(filePath) {
    const fullPath = path.join(this.baseDir, filePath);
    return await fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Verifica si un archivo existe
   */
  async exists(filePath) {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Elimina un archivo
   */
  async deleteFile(filePath) {
    const fullPath = path.join(this.baseDir, filePath);
    await fs.unlink(fullPath);
    this.files.delete(filePath);
    logger.debug(`[FILE DELETED] ${filePath}`);
  }

  /**
   * Lista archivos en un directorio
   */
  async listFiles(dirPath = '') {
    const fullPath = path.join(this.baseDir, dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    return entries.map(e => ({
      name: e.name,
      isFile: e.isFile(),
      isDirectory: e.isDirectory()
    }));
  }

  /**
   * Obtiene estadisticas de un archivo
   */
  async stat(filePath) {
    const fullPath = path.join(this.baseDir, filePath);
    return await fs.stat(fullPath);
  }

  /**
   * Limpia todo el sandbox
   */
  async cleanup() {
    try {
      await fs.rm(this.baseDir, { recursive: true, force: true });
      this.files.clear();
      this.createdDirs.clear();
      logger.debug(`[SANDBOX CLEANED] ${this.baseDir}`);
    } catch (error) {
      logger.warn(`[CLEANUP WARNING] ${this.baseDir}:`, error.message);
    }
  }

  /**
   * Obtiene el path completo de un archivo relativo
   */
  getFullPath(filePath) {
    return path.join(this.baseDir, filePath);
  }

  /**
   * Crea un archivo JS de ejemplo
   */
  async createJSFile(filePath, options = {}) {
    const {
      exports = [],
      imports = [],
      functions = [],
      classes = []
    } = options;

    let content = '';

    // Imports
    for (const imp of imports) {
      if (imp.default) {
        content += `import ${imp.name} from '${imp.path}';\n`;
      } else {
        content += `import { ${imp.names.join(', ')} } from '${imp.path}';\n`;
      }
    }
    if (imports.length > 0) content += '\n';

    // Functions
    for (const fn of functions) {
      const async = fn.async ? 'async ' : '';
      const params = fn.params?.join(', ') || '';
      const body = fn.body || 'return null;';
      content += `export ${async}function ${fn.name}(${params}) {\n  ${body}\n}\n\n`;
    }

    // Classes
    for (const cls of classes) {
      content += `export class ${cls.name} {\n`;
      for (const method of cls.methods || []) {
        const async = method.async ? 'async ' : '';
        const params = method.params?.join(', ') || '';
        content += `  ${async}${method.name}(${params}) {\n    // implementation\n  }\n\n`;
      }
      content += `}\n\n`;
    }

    // Default export
    if (exports.includes('default')) {
      const mainExport = functions[0]?.name || classes[0]?.name || 'main';
      content += `export default ${mainExport};\n`;
    }

    return await this.createFile(filePath, content);
  }

  /**
   * Crea un package.json
   */
  async createPackageJson(options = {}) {
    const pkg = {
      name: options.name || 'test-project',
      version: options.version || '1.0.0',
      type: options.type || 'module',
      dependencies: options.dependencies || {},
      devDependencies: options.devDependencies || {},
      ...options.extra
    };
    
    return await this.createFile('package.json', JSON.stringify(pkg, null, 2));
  }
}

/**
 * Factory function para casos simples
 */
export async function createSandbox(files = {}, baseDir = null) {
  const factory = await FileSystemFactory.create(baseDir);
  
  if (Object.keys(files).length > 0) {
    await factory.createFiles(files);
  }
  
  return factory;
}

/**
 * Helper para tests: crea sandbox, ejecuta callback, limpia
 */
export async function withSandbox(files, callback, baseDir = null) {
  const sandbox = await createSandbox(files, baseDir);
  
  try {
    return await callback(sandbox);
  } finally {
    await sandbox.cleanup();
  }
}

export default {
  FileSystemFactory,
  createSandbox,
  withSandbox
};
