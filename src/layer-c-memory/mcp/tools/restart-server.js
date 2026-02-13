import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:restart:server');



/**
 * MCP Tool: restart_server
 * Reinicia el servidor OmnySys para cargar código actualizado
 * 
 * ⚠️ IMPORTANTE: Este reinicio NO mata el proceso, solo reinicia los componentes internos
 * para que OpenCode no pierda la conexión MCP.
 */

export async function restart_server(args, context) {
  const { clearCache = false, reanalyze = false } = args;
  const { cache, server, orchestrator } = context;

  try {
    logger.info('🔄 Reiniciando servidor OmnySys...');

    const result = {
      restarting: true,
      clearCache: clearCache,
      reanalyze: reanalyze,
      timestamp: new Date().toISOString(),
      message: 'Server restart initiated. Please wait...'
    };

    // Paso 1: Limpiar caché si se solicita
    if (clearCache && cache) {
      logger.info('🧹 Limpiando caché...');
      await cache.clear();

      // También limpiar archivos del sistema si se solicita re-análisis completo
      if (reanalyze) {
        logger.info('🗑️  Eliminando análisis anterior...');
        const fs = await import('fs/promises');
        const path = await import('path');
        const dataDir = path.join(server.projectPath, '.omnysysdata');

        try {
          // Eliminar solo los archivos de análisis, no la configuración
          const filesDir = path.join(dataDir, 'files');
          const indexFile = path.join(dataDir, 'index.json');

          await fs.rm(filesDir, { recursive: true, force: true });
          await fs.unlink(indexFile).catch(() => { });

          logger.info('✅ Análisis anterior eliminado');
          result.analysisCleared = true;
        } catch (err) {
          logger.warn('⚠️  No se pudo eliminar análisis anterior:', err.message);
        }
      }

      result.cacheCleared = true;
    }

    // Paso 2: Detener componentes actuales
    logger.info('⏹️  Deteniendo componentes...');

    if (orchestrator) {
      try {
        await orchestrator.stop();
        logger.info('✅ Orchestrator detenido');
      } catch (err) {
        logger.warn('⚠️  Error deteniendo orchestrator:', err.message);
      }
    }

    // Paso 3: Reiniciar el pipeline de inicialización
    logger.info('🚀 Reiniciando pipeline de inicialización...');

    // Resetear estado
    server.initialized = false;
    server.orchestrator = null;
    server.cache = null;
    server.startTime = Date.now();

    // Volver a ejecutar el pipeline
    try {
      const { InitializationPipeline } = await import('../core/initialization/pipeline.js');
      const {
        LLMSetupStep,
        LayerAAnalysisStep,
        OrchestratorInitStep,
        CacheInitStep,
        ReadyStep
      } = await import('../core/initialization/steps/index.js');

      // Crear nuevo pipeline SIN McpSetupStep
      // ⚠️ CRITICAL: McpSetupStep MUST NOT be re-run during restart.
      // The MCP protocol is already configured on the active stdio connection.
      // Re-running it would re-configure the transport, causing:
      //   - "Cannot call write after a stream was destroyed" errors
      //   - Duplicate server instances in the IDE
      //   - Broken stdio pipe between IDE and MCP
      server.pipeline = new InitializationPipeline([
        new LLMSetupStep(),
        new LayerAAnalysisStep(),
        new OrchestratorInitStep(),
        new CacheInitStep(),
        new ReadyStep()
      ]);

      // Ejecutar inicialización
      const initResult = await server.pipeline.execute(server);

      if (initResult.success) {
        server.initialized = true;
        logger.info('✅ Servidor reiniciado exitosamente');
        result.success = true;
        result.componentsRestarted = ['LLM', 'LayerA', 'Orchestrator', 'Cache'];
      } else {
        throw new Error(`Inicialización falló en: ${initResult.failedAt || initResult.haltedAt}`);
      }
    } catch (initError) {
      logger.error('❌ Error reiniciando servidor:', initError.message);
      result.success = false;
      result.error = initError.message;
    }

    return result;
  } catch (error) {
    logger.error('❌ Error en restart_server:', error.message);
    return {
      error: error.message,
      restarting: false,
      success: false
    };
  }
}
