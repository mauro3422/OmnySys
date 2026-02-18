/**
 * @fileoverview Validation Context - Contexto de validación
 * 
 * @module validation-engine/context
 */

import { createLogger } from '../../utils/logger.js';
import { FileLoader } from './file-loader.js';

const logger = createLogger('OmnySys:validation:context');

/**
 * Contexto de validación
 */
export class ValidationContext {
  constructor(projectPath, omnysysPath) {
    this.projectPath = projectPath;
    this.omnysysPath = omnysysPath;
    this.files = new Map();
    this.atoms = new Map();
    this.molecules = new Map();
    this.modules = new Map();
    this.sourceCache = new Map();
    this.astCache = new Map();
    this.timestamp = new Date().toISOString();
    this.index = {};
    this.fileLoader = new FileLoader(this);
  }

  async load() {
    logger.info('Loading validation context...');
    await this.fileLoader.loadFiles();
    await this.fileLoader.loadIndex();
    logger.info(`Context loaded: ${this.files.size} files`);
    return this;
  }

  async getSource(filePath) {
    if (this.sourceCache.has(filePath)) {
      return this.sourceCache.get(filePath);
    }
    const code = await this.fileLoader.readSourceFile(filePath);
    if (code) this.sourceCache.set(filePath, code);
    return code;
  }

  getEntity(id) {
    return this.files.get(id) || 
           this.atoms.get(id) || 
           this.molecules.get(id) ||
           this.modules.get(id);
  }

  getEntitiesByType(type) {
    switch (type) {
      case 'file':
      case 'molecule':
        return Array.from(this.files.values());
      case 'atom':
        return Array.from(this.atoms.values());
      case 'module':
        return Array.from(this.modules.values());
      default:
        return [];
    }
  }

  hasEntity(id) {
    return this.getEntity(id) !== undefined;
  }
}

export default { ValidationContext };
