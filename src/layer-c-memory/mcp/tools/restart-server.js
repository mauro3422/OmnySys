import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:restart:server');


/**
 * MCP Tool: restart_server
 * Reinicia el servidor OmnySys para cargar código actualizado
 */

export async function restart_server(args, context) {
  const { clearCache = false } = args;
  const { cache } = context;
  
  try {
    logger.error('🔄 Reiniciando servidor OmnySys...');
    
    const result = {
      restarting: true,
      clearCache: clearCache,
      timestamp: new Date().toISOString(),
      message: 'Server restart initiated. Please wait...'
    };
    
    // Limpiar caché si se solicita
    if (clearCache && cache) {
      logger.error('🧹 Limpiando caché...');
      cache.invalidate('analysis:*');
      cache.invalidate('atom:*');
      cache.invalidate('derived:*');
      cache.invalidate('impact:*');
      cache.invalidate('connections');
      cache.invalidate('assessment');
      result.cacheCleared = true;
    }
    
    // Programar reinicio
    setTimeout(() => {
      logger.error('👋 Cerrando servidor actual...');
      process.exit(0); // El proceso padre (OpenCode) reiniciará el servidor
    }, 1000);
    
    return result;
  } catch (error) {
    return { error: error.message };
  }
}
