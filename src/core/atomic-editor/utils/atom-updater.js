/**
 * @fileoverview Atom Updater - Actualización de átomos en el sistema
 * 
 * Responsabilidad Única (SRP): Actualizar átomos e invalidar cachés después de ediciones.
 * 
 * @module atomic-editor/utils
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:atomic:editor:updater');

/**
 * Actualiza el átomo en el sistema después de una edición
 * 
 * @param {string} filePath - Path del archivo modificado
 * @param {Object} orchestrator - Orquestador del sistema
 * @param {string} projectPath - Path del proyecto
 * @param {Object} impact - Impacto de los cambios
 * @returns {Promise<void>}
 */
export async function updateAtom(filePath, orchestrator, projectPath, impact) {
  try {
    // Notify orchestrator
    if (orchestrator?.handleFileChange) {
      await orchestrator.handleFileChange(filePath, 'modified', {
        skipDebounce: true,
        priority: 'critical'
      });
    }

    // Invalidate cache
    await invalidateCache(filePath, projectPath);

  } catch (error) {
    logger.warn(`  ⚠️  Could not update atom: ${error.message}`);
  }
}

/**
 * Invalida cachés relacionadas con el archivo
 * 
 * @param {string} filePath - Path del archivo
 * @param {string} projectPath - Path del proyecto
 * @returns {Promise<void>}
 */
export async function invalidateCache(filePath, projectPath) {
  try {
    const { getCacheManager } = await import('#core/cache/singleton.js');
    const cache = await getCacheManager(projectPath);
    
    if (cache) {
      cache.invalidate(`analysis:${filePath}`);
      cache.invalidate(`atom:${filePath}`);
      logger.debug(`Cache invalidated for ${filePath}`);
    }
  } catch (error) {
    logger.warn(`Could not invalidate cache: ${error.message}`);
  }
}

/**
 * Emite evento de éxito de modificación
 * 
 * @param {Function} emit - Función de emit
 * @param {string} filePath - Path del archivo
 * @param {string} operationType - Tipo de operación
 * @param {Object} result - Resultado de la operación
 */
export function emitModificationSuccess(emit, filePath, operationType, result) {
  emit('atom:modified', {
    file: filePath,
    operation: operationType,
    changes: result,
    timestamp: Date.now()
  });
}

/**
 * Emite evento de creación de átomo
 * 
 * @param {Function} emit - Función de emit
 * @param {string} filePath - Path del archivo
 */
export function emitAtomCreated(emit, filePath) {
  emit('atom:created', {
    file: filePath,
    timestamp: Date.now()
  });
}
