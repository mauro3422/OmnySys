import { createLogger } from '../../../utils/logger.js';
import { DEFAULT_CACHE_INVALIDATION_PATTERNS, invalidateCachePatterns } from '../../../shared/cache/cache-maintenance.js';

const logger = createLogger('OmnySys:server:tools');


/**
 * @fileoverview Server Management Tools
 * 
 * Herramientas para gestión del servidor
 * 
 * @module unified-server/tools/server-tools
 */

/**
 * Reinicia el servidor
 * @param {boolean} clearCache - Si se debe limpiar el caché
 * @returns {Promise<Object>} - Resultado del reinicio
 */
export async function restartServer(clearCache = false) {
  try {
    logger.info('🔄 Reiniciando servidor OmnySys...');
    
    const result = {
      restarting: true,
      clearCache: clearCache,
      timestamp: new Date().toISOString(),
      message: 'Server restart initiated'
    };
    
    if (clearCache && this.cache) {
      logger.info('🧹 Limpiando caché...');
      this.cache.purge();
      result.cacheCleared = true;
    }

    if (this.cache) {
      const cleanup = invalidateCachePatterns(this.cache, DEFAULT_CACHE_INVALIDATION_PATTERNS);
      result.cacheInvalidated = cleanup.invalidated > 0;
      result.cacheInvalidationPatterns = cleanup.patterns;
    }
    
    setTimeout(async () => {
      logger.info('👋 Cerrando servidor actual...');
      await this.shutdown();
      logger.info('🚀 Reiniciando...');
      process.exit(0);
    }, 1000);
    
    return result;
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Limpia el caché de análisis
 * @returns {Promise<Object>} - Resultado de la limpieza
 */
export async function clearAnalysisCache() {
  try {
    if (!this.cache) {
      return { error: 'Cache not initialized' };
    }
    
    const beforeStats = this.cache.getRamCacheStats();

    invalidateCachePatterns(this.cache, DEFAULT_CACHE_INVALIDATION_PATTERNS);
    this.cache.invalidate('connections');
    this.cache.invalidate('assessment');
    
    const afterStats = this.cache.getRamCacheStats();
    
    return {
      cleared: true,
      before: beforeStats,
      after: afterStats,
      message: 'Analysis cache cleared successfully'
    };
  } catch (error) {
    return { error: error.message };
  }
}
