/**
 * @fileoverview relationships.js
 * 
 * Gestion de dependencias y relaciones entre archivos.
 * 
 * @module file-watcher/handlers/relationships
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';

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
 * Lee el system-map persistido en .omnysysdata/system-map-enhanced.json.
 * @param {string} filePath - Path relativo del archivo
 * @returns {Promise<string[]>} - Paths de archivos que importan este archivo
 */
export async function getDependents(filePath) {
  const systemMapPath = path.join(this.dataPath, 'system-map-enhanced.json');

  try {
    const content = await fs.readFile(systemMapPath, 'utf-8');
    const systemMap = JSON.parse(content);

    const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');

    const fileNode = systemMap.files?.[normalized] || systemMap.files?.[filePath];
    if (fileNode?.usedBy?.length > 0) {
      return fileNode.usedBy;
    }

    const dependents = [];
    for (const [fp, node] of Object.entries(systemMap.files || {})) {
      if ((node.dependsOn || []).some(dep =>
        dep === normalized || dep === filePath || dep.endsWith(normalized)
      )) {
        dependents.push(fp);
      }
    }
    return dependents;
  } catch {
    return [];
  }
}

export default {
  notifyDependents,
  getDependents
};
