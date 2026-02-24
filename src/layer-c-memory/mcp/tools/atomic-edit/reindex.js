/**
 * @fileoverview Re-indexación de archivos
 * Extraído de atomic-edit.js para modularidad
 */

import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { saveAtomsIncremental } from '#layer-c/storage/atoms/incremental-atom-saver.js';
import { extractAtoms } from '#layer-a/extractors/atomic/index.js';

const logger = createLogger('OmnySys:atomic:reindex');

/**
 * Re-indexa un archivo después de editar (incremental)
 * Usa el extractor atómico completo para obtener toda la metadata
 */
export async function reindexFile(filePath, projectPath) {
  try {
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(projectPath, filePath);
    
    const fs = await import('fs/promises');
    const code = await fs.readFile(absolutePath, 'utf-8');
    
    const atoms = extractAtoms(code, absolutePath);
    
    if (!atoms || atoms.length === 0) {
      logger.warn(`[Reindex] No atoms found in ${absolutePath}`);
      return { success: true, atoms: [], exports: [] };
    }
    
    const relativePath = path.relative(projectPath, absolutePath);
    
    await saveAtomsIncremental(projectPath, relativePath, atoms, { source: 'atomic-edit' });
    
    // Invalidate cache for this file
    try {
      const { invalidateCacheInstance } = await import('#core/cache/index.js');
      await invalidateCacheInstance(projectPath);
      logger.debug(`[Reindex] Cache invalidated for ${relativePath}`);
    } catch (e) {
      logger.warn(`[Reindex] Cache invalidation failed: ${e.message}`);
    }
    
    logger.info(`[Reindex] Updated ${atoms.length} atoms for ${relativePath}`);
    
    return { 
      success: true, 
      atoms,
      exports: [],
      relativePath
    };
  } catch (error) {
    logger.error(`[Reindex] Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}
