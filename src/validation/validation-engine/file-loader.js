/**
 * @fileoverview File Loader - Carga archivos para el contexto
 * 
 * @module validation-engine/file-loader
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../utils/logger.js';
import { safeReadJson } from '../../utils/json-safe.js';

const logger = createLogger('OmnySys:validation:file-loader');

/**
 * Carga archivos del sistema de archivos
 */
export class FileLoader {
  constructor(context) {
    this.context = context;
  }

  async loadFiles() {
    const filesPath = path.join(this.context.omnysysPath, 'files');
    try {
      await this.walkDirectory(filesPath, async (filePath) => {
        if (!filePath.endsWith('.json')) return;
        const relativePath = path.relative(filesPath, filePath);
        const data = await safeReadJson(filePath);
        if (data) {
          data._omnysysPath = relativePath.replace(/\\/g, '/');
          this.context.files.set(data.path || relativePath.replace('.json', ''), data);
        }
      });
    } catch (error) {
      logger.warn('No files directory found:', error.message);
    }
  }

  async loadIndex() {
    const indexPath = path.join(this.context.omnysysPath, 'index.json');
    this.context.index = await safeReadJson(indexPath) || {};
  }

  async readSourceFile(filePath) {
    const fullPath = path.join(this.context.projectPath, filePath);
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch {
      return null;
    }
  }

  async walkDirectory(dirPath, callback) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await this.walkDirectory(fullPath, callback);
        } else {
          await callback(fullPath);
        }
      }
    } catch {
      // Directorio no existe, ignorar
    }
  }
}

export default { FileLoader };
