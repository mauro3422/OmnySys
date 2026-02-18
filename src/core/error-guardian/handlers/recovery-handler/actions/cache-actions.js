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
 * @param {string} projectPath - Ruta del proyecto
 * @param {Object} stats - Estadísticas
 * @returns {Promise<void>}
 */
export async function clearCache(projectPath, stats) {
  try {
    const { UnifiedCacheManager } = await import('#core/cache/manager/index.js');
    const cache = new UnifiedCacheManager(projectPath);
    await cache.clear();
    logger.info('🗑️  Caché limpiado automáticamente');
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
