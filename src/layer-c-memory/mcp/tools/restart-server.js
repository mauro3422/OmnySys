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

    // ── TRUE RESTART via proxy ────────────────────────────────────────────
    // Si corremos bajo mcp-server.js (proxy), process.send() está disponible.
    // El proxy mata este proceso y spawna uno nuevo → ESM cache limpio.
    // La conexión stdio de Claude Code NO se interrumpe.
    if (typeof process.send === 'function') {
      logger.info('📡 Enviando señal de restart al proxy (true Node.js restart)...');

      // Limpiar caché en disco si se pidió, antes de morir
      if (clearCache && cache) {
        logger.info('🧹 Limpiando caché antes de reiniciar...');
        await cache.clear();
        if (reanalyze) {
          const fs = await import('fs/promises');
          const path = await import('path');
          const dataDir = path.join(server.projectPath, '.omnysysdata');
          // Borrar toda la estructura de análisis para forzar reindex completo
          // Incluye atoms/ y molecules/ para que el nuevo parser regenere todo
          const toDelete = ['files', 'atoms', 'molecules'];
          for (const dir of toDelete) {
            await fs.rm(path.join(dataDir, dir), { recursive: true, force: true }).catch(() => {});
          }
          await fs.unlink(path.join(dataDir, 'index.json')).catch(() => {});
          logger.info('✅ Análisis anterior eliminado (atoms + molecules + files + index)');
        }
      }

      // Señalar al proxy — el proxy espera 300ms y luego mata+respawnea
      process.send({ type: 'restart', clearCache });

      return {
        success: true,
        restarting: true,
        restartType: 'true_process_restart',
        clearCache,
        reanalyze,
        timestamp: new Date().toISOString(),
        message: 'Proxy received restart signal. New Node.js process will start in ~1s with fresh ESM cache. Claude Code connection stays alive.'
      };
    }
    // ── FALLBACK: component-only restart (standalone mode, no proxy) ─────

    const result = {
      restarting: true,
      restartType: 'component_restart',
      clearCache: clearCache,
      reanalyze: reanalyze,
      timestamp: new Date().toISOString(),
      message: 'Server restart initiated (component-only — run via npm run mcp for true restart).'
    };

    // Paso 1: Limpiar caché si se solicita
    if (clearCache && cache) {
      logger.info('🧹 Limpiando caché...');
      await cache.clear();

      // También limpiar archivos del sistema si se solicita re-análisis completo
      if (reanalyze) {
        logger.info('🗑️  Eliminando análisis anterior (reindex completo)...');
        const fs = await import('fs/promises');
        const path = await import('path');
        const dataDir = path.join(server.projectPath, '.omnysysdata');

        try {
          const toDelete = ['files', 'atoms', 'molecules'];
          for (const dir of toDelete) {
            await fs.rm(path.join(dataDir, dir), { recursive: true, force: true }).catch(() => {});
          }
          await fs.unlink(path.join(dataDir, 'index.json')).catch(() => {});

          logger.info('✅ Análisis anterior eliminado (atoms + molecules + files + index)');
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

      // Crear nuevo pipeline SIN McpSetupStep NI InstanceDetectionStep
      // ⚠️ CRITICAL: McpSetupStep MUST NOT be re-run during restart.
      // The MCP protocol is already configured on the active stdio connection.
      // Re-running it would re-configure the transport, causing:
      //   - "Cannot call write after a stream was destroyed" errors
      //   - Duplicate server instances in the IDE
      //   - Broken stdio pipe between IDE and MCP
      //
      // ⚠️ ORDER MATTERS (same as initial pipeline):
      // 1. LayerAAnalysisStep — re-check/re-run static analysis if files changed
      // 2. CacheInitStep      — load fresh data BEFORE orchestrator starts
      // 3. LLMSetupStep       — start LLM in background
      // 4. OrchestratorInitStep — init orchestrator (requires cache to exist)
      // 5. ReadyStep          — finalize
      server.pipeline = new InitializationPipeline([
        new LayerAAnalysisStep(),
        new CacheInitStep(),
        new LLMSetupStep(),
        new OrchestratorInitStep(),
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
