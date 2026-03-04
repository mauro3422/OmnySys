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
  const { clearCache = false, reanalyze = false, reindexOnly = false, clearCacheOnly = false } = args;
  const { cache, server, orchestrator } = context;

  try {
    logger.info('🔄 Reiniciando servidor OmnySys...');

    // ── FAST PATH: clearCacheOnly — just flush in-memory cache + refresh tools ──────
    if (clearCacheOnly) {
      logger.info('⚡ Cache-only flush requested...');
      if (cache) {
        await cache.clear();
        logger.info('✅ In-memory cache cleared');
      }
      // Refresh tool registry to pick up any edited tool files
      try {
        const { refreshToolRegistry } = await import('../../mcp-http-server.js');
        await refreshToolRegistry();
        logger.info('🔄 Tool registry refreshed');
      } catch { /* not in HTTP mode */ }
      return {
        success: true,
        restarting: false,
        restartType: 'cache_only_flush',
        message: 'In-memory cache flushed and tool registry refreshed. No reindex needed.',
        timestamp: new Date().toISOString()
      };
    }

    // ── PROXY MODE INTERCEPT / IPC RESTART ───────────────────────────────
    // If we are running under an IPC process (e.g. mcp-http-proxy or mcp-stdio-bridge)
    // we let the parent proxy handle the entire ESM cache flush by killing and respawning us.
    if (process.env.OMNYSYS_PROXY_MODE === '1' || typeof process.send === 'function') {
      logger.info('📡 Enviando señal de restart al proxy (true Node.js restart)...');

      // Limpiar caché en disco si se pidió, antes de morir
      if (clearCache && cache) {
        logger.info('🧹 Limpiando caché local antes de reiniciar...');
        await cache.clear();
        if (reanalyze) {
          const fs = await import('fs/promises');
          const path = await import('path');
          const dataDir = path.join(server.projectPath, '.omnysysdata');

          const toDelete = ['files', 'atoms', 'molecules'];
          for (const dir of toDelete) {
            await fs.rm(path.join(dataDir, dir), { recursive: true, force: true }).catch(() => { });
          }
          const dbFiles = ['omnysys.db', 'omnysys.db-wal', 'omnysys.db-shm', 'index.json', 'atom-versions.json'];
          for (const file of dbFiles) {
            await fs.unlink(path.join(dataDir, file)).catch(() => { });
          }
          logger.info('✅ Análisis anterior eliminado (DB + atoms + molecules + files + index)');
        }
      }

      // Señalar al proxy — el proxy espera 300ms y luego mata+respawnea
      if (process.send) {
        process.send({ type: 'restart', clearCache, reanalyze, clearCacheOnly, reindexOnly });
      }

      return {
        success: true,
        restarting: true,
        restartType: 'true_process_restart',
        clearCache,
        reanalyze,
        timestamp: new Date().toISOString(),
        message: 'Proxy received restart signal. New Node.js process will start in ~2s with fresh ESM cache. Connection stays alive.',
        esmCacheCleared: true
      };
    }

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
          // SQLite-only mode: only delete the DB files (no JSON dirs)
          // atoms/, molecules/, files/ directories no longer exist (removed in v0.9.70)
          const dbFiles = ['omnysys.db', 'omnysys.db-wal', 'omnysys.db-shm'];
          for (const file of dbFiles) {
            await fs.unlink(path.join(dataDir, file)).catch(() => { });
          }
          // Also clean up old JSON legacy files if they somehow still exist
          const legacyFiles = ['index.json', 'atom-versions.json'];
          for (const file of legacyFiles) {
            await fs.unlink(path.join(dataDir, file)).catch(() => { });
          }

          logger.info('✅ Análisis anterior eliminado (DB SQLite + legacy files)');
          result.analysisCleared = true;
        } catch (err) {
          logger.warn('⚠️  No se pudo eliminar análisis anterior:', err.message);
        }
      }

      result.cacheCleared = true;
    }

    // ── FAST PATH: reindexOnly — force Layer A reanalysis without clearing DB ─────────
    if (reindexOnly) {
      logger.info('🔄 ReindexOnly: forcing Layer A re-analysis (DB preserved)...');
      try {
        const { LayerAAnalysisStep } = await import('../core/initialization/steps/index.js');
        const step = new LayerAAnalysisStep();
        // Force reindex by temporarily marking as not analyzed
        const originalAnalyzed = server._layerAComplete;
        server._layerAComplete = false;
        await step.execute(server);
        server._layerAComplete = originalAnalyzed;
        logger.info('✅ Layer A re-analysis complete');
        result.reindexed = true;
      } catch (err) {
        logger.warn('⚠️  ReindexOnly failed:', err.message);
        result.reindexError = err.message;
      }
      result.success = true;
      result.restartType = 'reindex_only';
      result.message = 'Layer A re-analysis forced. DB preserved, no process restart.';
      return result;
    }

    // Paso 2: Detener SOLO el orchestrator (rápido, sin matar el proceso ni el HTTP server)
    logger.info('⏹️  Deteniendo orchestrator...');
    if (orchestrator) {
      try {
        await orchestrator.stop();
        logger.info('✅ Orchestrator detenido');
      } catch (err) {
        logger.warn('⚠️  Error deteniendo orchestrator:', err.message);
      }
    }

    // Paso 3: Si reanalyze=true → full pipeline con LayerA (lento, ~10-30s).
    // De lo contrario → restart rápido del Orchestrator solamente (<1s). 
    //
    // ⚠️ CRÍTICO: LayerAAnalysisStep tarda 10-30s. Durante ese tiempo el HTTP
    // server sigue levantado, pero el MCP sesión puede expirar o VS Code puede
    // re-lanzar el terminal task y colisionar con el puerto 9999.
    // Por eso, LayerA SOLO corre si el usuario lo pide explícitamente.
    if (reanalyze) {
      logger.info('🔄 reanalyze=true — Ejecutando pipeline completo (LayerA + Cache + Orchestrator)...');

      // Cerrar el health beacon antes de reiniciar el pipeline completo
      if (server._healthBeacon) {
        try {
          await new Promise(resolve => server._healthBeacon.close(resolve));
          server._healthBeacon = null;
        } catch { server._healthBeacon = null; }
      }

      server.initialized = false;
      server.orchestrator = null;
      server.cache = null;
      server.startTime = Date.now();

      try {
        const { InitializationPipeline } = await import('../core/initialization/pipeline.js');
        const { LLMSetupStep, LayerAAnalysisStep, OrchestratorInitStep, CacheInitStep, ReadyStep } =
          await import('../core/initialization/steps/index.js');

        // ⚠️ McpSetupStep + InstanceDetectionStep omitidos — ya están activos
        server.pipeline = new InitializationPipeline([
          new LayerAAnalysisStep(),
          new CacheInitStep(),
          new LLMSetupStep(),
          new OrchestratorInitStep(),
          new ReadyStep()
        ]);

        const initResult = await server.pipeline.execute(server);

        if (initResult.success) {
          server.initialized = true;
          logger.info('✅ Pipeline completo terminado');
          result.success = true;
          result.componentsRestarted = ['LayerA', 'Cache', 'LLM', 'Orchestrator'];
        } else {
          throw new Error(`Pipeline falló en: ${initResult.failedAt || initResult.haltedAt}`);
        }
      } catch (pipelineErr) {
        logger.error('❌ Error en pipeline completo:', pipelineErr.message);
        result.success = false;
        result.error = pipelineErr.message;
        return result;
      }
    } else {
      // ── FAST RESTART: solo reiniciar el Orchestrator (<1s) ────────────────
      logger.info('⚡ Fast restart — solo reiniciando Orchestrator (sin LayerA)...');
      try {
        const { OrchestratorInitStep } = await import('../core/initialization/steps/index.js');
        const step = new OrchestratorInitStep();
        await step.execute(server);
        server.initialized = true;
        logger.info('✅ Orchestrator reiniciado');
        result.success = true;
        result.componentsRestarted = ['Orchestrator'];
        result.message = 'Fast restart complete. Orchestrator restarted, tool registry refreshed. No Layer A reindex.';
      } catch (orchErr) {
        logger.error('❌ Error reiniciando Orchestrator:', orchErr.message);
        result.success = false;
        result.error = orchErr.message;
        return result;
      }
    }

    // Paso 4: Refresh tool registry (cache-busting import para cargar código nuevo)
    try {
      const { refreshToolRegistry } = await import('../../mcp-http-server.js');
      await refreshToolRegistry();
      logger.info('🔄 Tool registry refreshed after restart');
      result.toolRegistryRefreshed = true;
    } catch (refreshErr) {
      // May fail if imported from a non-HTTP context
      logger.warn('⚠️  Tool registry refresh skipped:', refreshErr.message);
      result.toolRegistryRefreshed = false;
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
