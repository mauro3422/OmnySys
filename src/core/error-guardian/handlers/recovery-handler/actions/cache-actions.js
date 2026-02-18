/**
 * @fileoverview Cache Actions
 * 
 * Acciones relacionadas con la caché del sistema.
 * 
 * @module core/error-guardian/handlers/recovery-handler/actions/cache-actions
 */

import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:error:recovery');

/**
 * Limpia la caché del sistema
 * 
 * IMPORTANTE: Después de limpiar el disco, se invalida el singleton para que
 * la próxima llamada a getCacheManager() reinicialice desde el estado limpio.
 * 
 * @param {string} projectPath - Ruta del proyecto
 * @param {Object} stats - Estadísticas
 * @returns {Promise<boolean>}
 */
export async function clearCache(projectPath, stats) {
  try {
    const { UnifiedCacheManager } = await import('#core/cache/manager/index.js');
    // Instancia temporal solo para limpiar disco (no va por el singleton)
    const tempCache = new UnifiedCacheManager(projectPath);
    await tempCache.clear();

    // Invalidar singleton para que el próximo getCacheManager() re-inicialice
    const { invalidateCacheInstance } = await import('#core/cache/singleton.js');
    invalidateCacheInstance(projectPath);

    logger.info('🗑️  Caché limpiado automáticamente (singleton invalidado)');
    stats.byAction.cache_clear = (stats.byAction.cache_clear || 0) + 1;
    return true;
  } catch (e) {
    logger.error('❌ Failed to clear cache:', e.message);
    return false;
  }
}

/**
 * Fix cache errors by clearing cache
 * @param {string} projectPath - Ruta del proyecto
 * @param {Object} stats - Estadísticas
 * @returns {Promise<boolean>}
 */
export async function fixCacheError(projectPath, stats) {
  return clearCache(projectPath, stats);
}
