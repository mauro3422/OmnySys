/**
 * @fileoverview MCP Restart Server Tool
 * 
 * =========================================================================
 * 🚨 CRITICAL AI AGENT WARNING 🚨
 * TO RESTART THE SERVER, YOU MUST USE THIS MCP TOOL (`restart_server`).
 * 
 * NEVER USE `run_command` TO EXECUTE CLI DAEMON SPAWNS (`omny up`, `npm run mcp`)
 * IN THE BACKGROUND. Spawning the OmnySys server via terminal commands disconnects 
 * the primary IDE socket and bricks the entire MCP functionality.
 * ALWAYS use this tool to refresh the system state safely.
 * =========================================================================
 * 
 * @module mcp/tools/restart-server
 */
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
            await fs.rm(path.join(dataDir, dir), { recursive: true, force: true }).catch(() => { });
          }
          // También borrar la base de datos SQLite y sus archivos temporales para integridad total
          const dbFiles = ['omnysys.db', 'omnysys.db-wal', 'omnysys.db-shm', 'index.json', 'atom-versions.json'];
          for (const file of dbFiles) {
            await fs.unlink(path.join(dataDir, file)).catch(() => { });
          }
          logger.info('✅ Análisis anterior eliminado (DB + atoms + molecules + files + index)');
        }
      }

      // Señalar al proxy — el proxy espera 300ms y luego mata+respawnea
      process.send({ type: 'restart', clearCache, reanalyze });

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
    // (Removed TRUE RESTART via HTTP Daemon. HTTP Daemon will now use component-only restart)

    // ── FALLBACK: component-only restart (standalone mode, no proxy) ─────
    // NOTA: En modo standalone (sin proxy), NO se puede limpiar el cache ESM de Node.js.
    // Los módulos ESM una vez importados son inmutables. El único fix real es reiniciar
    // el proceso completo, lo cual requiere el proxy (mcp-server.js).
    //
    // ESM CACHE-BUSTING WORKAROUND:
    // Para módulos críticos (tools), usamos import() dinámico con query param
    // para forzar recarga. Esto NO es perfecto pero ayuda en algunos casos.

    logger.info('⚠️  Running in standalone mode (no proxy). True ESM cache clear requires proxy.');
    logger.info('   Recommendation: Run via "npm run mcp" for full restart capability.');

    const result = {
      restarting: true,
      restartType: 'component_restart',
      clearCache: clearCache,
      reanalyze: reanalyze,
      timestamp: new Date().toISOString(),
      message: 'Server restart initiated (component-only — ESM cache NOT cleared in standalone mode).',
      esmCacheCleared: false,
      recommendation: 'Use proxy mode (npm run mcp) for full ESM cache clearing'
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
            await fs.rm(path.join(dataDir, dir), { recursive: true, force: true }).catch(() => { });
          }
          await fs.unlink(path.join(dataDir, 'index.json')).catch(() => { });

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

        // Refresh the live tool registry so code changes in tool files
        // (e.g. code-generator.js, batch-generator.js) are picked up
        // without needing a true process restart.
        try {
          const { pathToFileURL } = await import('url');
          const path = await import('path');
          const serverPath = path.default.resolve(process.cwd(), 'src/layer-c-memory/mcp-http-server.js');
          const bustUrl = `${pathToFileURL(serverPath).href}?bust=${Date.now()}`;
          const mod = await import(bustUrl);
          if (typeof mod.refreshToolRegistry === 'function') {
            await mod.refreshToolRegistry();
            logger.info('🔄 Tool registry refreshed after component restart');
            result.toolRegistryRefreshed = true;
          }
        } catch (refreshErr) {
          logger.warn('⚠️  Tool registry refresh failed:', refreshErr.message);
          result.toolRegistryRefreshed = false;
          result.toolRegistryError = refreshErr.message;
        }
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
