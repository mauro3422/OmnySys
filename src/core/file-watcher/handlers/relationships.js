/**
 * @fileoverview relationships.js
 * 
 * Gestion de dependencias y relaciones entre archivos.
 * Usa SQLite para consultar dependencias.
 * 
 * @module file-watcher/handlers/relationships
 */

import { createLogger } from '../../../utils/logger.js';
import { getRepository } from '#layer-c/storage/repository/repository-factory.js';

const logger = createLogger('OmnySys:file-watcher:relations');

/**
 * Notifica a archivos dependientes que este archivo fue borrado
 */
export async function notifyDependents(filePath, reason) {
  const dependents = await this.getDependents(filePath);
  
  for (const dependent of dependents) {
    this.emit('dependency:broken', {
      from: dependent,
      to: filePath,
      reason
    });
  }
  
  if (dependents.length > 0) {
    logger.warn(`[BROKEN DEPS] ${filePath} deleted but ${dependents.length} files still import it`);
  }
}

/**
 * Obtiene archivos que dependen de este (lo importan).
 * Consulta SQLite para obtener dependientes.
 * @param {string} filePath - Path relativo del archivo
 * @returns {Promise<string[]>} - Paths de archivos que importan este archivo
 */
export async function getDependents(filePath) {
  try {
    const repo = getRepository(this.projectPath);
    
    if (!repo.db) {
      return [];
    }
    
    const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
    
    const rows = repo.db.prepare(`
      SELECT DISTINCT from_file FROM file_dependencies 
      WHERE to_file = ? OR to_file LIKE ?
    `).all(normalized, `%${normalized}`);
    
    return rows.map(r => r.from_file);
  } catch (error) {
    logger.debug(`[getDependents] Error querying SQLite: ${error.message}`);
    return [];
  }
}

export default {
  notifyDependents,
  getDependents
};
