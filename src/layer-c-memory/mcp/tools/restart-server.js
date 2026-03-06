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

    if (clearCacheOnly) return await handleClearCacheOnly(cache);
    if (reindexOnly) {
      const result = {
        restarting: false,
        restartType: 'reindex_only',
        clearCache,
        reanalyze: false,
        timestamp: new Date().toISOString(),
        esmCacheCleared: false
      };

      if (clearCache && cache) {
        await cache.clear();
        result.cacheCleared = true;
      }

      return await handleReindexOnly(server, cache, result);
    }
    if (isProxyMode()) return await handleProxyRestart(clearCache, reanalyze, clearCacheOnly, reindexOnly, cache, server);

    logger.info('⚠️  Running in standalone mode (no proxy). True ESM cache clear requires proxy.');
    logger.info('   Recommendation: Run via "npm run mcp" for full restart capability.');

    const result = {
      restarting: true,
      restartType: 'component_restart',
      clearCache,
      reanalyze,
      timestamp: new Date().toISOString(),
      message: 'Server restart initiated (component-only — ESM cache NOT cleared in standalone mode).',
      esmCacheCleared: false,
      recommendation: 'Use proxy mode (npm run mcp) for full ESM cache clearing'
    };

    if (clearCache && cache) await clearStandaloneCache(cache, reanalyze, server, result);
    if (reindexOnly) return await handleReindexOnly(server, cache, result);

    await stopOrchestrator(orchestrator);

    if (reanalyze) {
      await runFullPipeline(server, result);
    } else {
      await fastRestartOrchestrator(server, result);
    }

    await refreshRegistry(result);

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

// Helper functions to reduce complexity

async function handleClearCacheOnly(cache) {
  logger.info('⚡ Cache-only flush requested...');
  if (cache) {
    await cache.clear();
    logger.info('✅ In-memory cache cleared');
  }
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

function isProxyMode() {
  return process.env.OMNYSYS_PROXY_MODE === '1' || typeof process.send === 'function';
}

async function handleProxyRestart(clearCache, reanalyze, clearCacheOnly, reindexOnly, cache, server) {
  logger.info('📡 Enviando señal de restart al proxy (true Node.js restart)...');

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

  if (process.send) {
    process.send({ type: 'restart', clearCache, reanalyze, clearCacheOnly, reindexOnly });
  }

  const warningMessage = `
================================================================================
🚨 CRITICAL WARNING FOR AI AGENT (ANTIGRAVITY BUG PRE-EMPTION) 🚨
You just triggered a true process restart. Because of a known bug in the 
Antigravity IDE client, your current MCP session is now ORPHANED. 
Any subsequent MCP tool calls you make right now will SILENTLY HANG FOREVER 
and waste tokens.

-> WHAT YOU MUST DO IMMEDIATELY:
1. DO NOT call any other MCP tool.
2. Call the \`notify_user\` tool right now.
3. Tell the user: "I restarted the server. Please manually restart/reload Antigravity so the MCP session reconnects, then tell me to continue."
================================================================================
`.trim();

  return {
    success: true,
    restarting: true,
    restartType: 'true_process_restart',
    clearCache,
    reanalyze,
    timestamp: new Date().toISOString(),
    message: warningMessage,
    esmCacheCleared: true
  };
}

async function clearStandaloneCache(cache, reanalyze, server, result) {
  logger.info('🧹 Limpiando caché...');
  await cache.clear();

  if (reanalyze) {
    logger.info('🗑️  Eliminando análisis anterior (reindex completo)...');
    const fs = await import('fs/promises');
    const path = await import('path');
    const dataDir = path.join(server.projectPath, '.omnysysdata');

    try {
      const dbFiles = ['omnysys.db', 'omnysys.db-wal', 'omnysys.db-shm'];
      for (const file of dbFiles) {
        await fs.unlink(path.join(dataDir, file)).catch(() => { });
      }
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

async function handleReindexOnly(server, cache, result) {
  logger.info('🔄 ReindexOnly: forcing Layer A re-analysis (DB preserved)...');
  try {
    await invalidateIncrementalState(server);

    const { LayerAAnalysisStep } = await import('../core/initialization/steps/index.js');
    const step = new LayerAAnalysisStep();
    const originalAnalyzed = server._layerAComplete;
    server._layerAComplete = false;
    await step.execute(server);
    server._layerAComplete = originalAnalyzed;

    if (typeof server.reloadMetadata === 'function') {
      await server.reloadMetadata();
    }

    if (cache?.initialize) {
      await cache.initialize();
      if (server.metadata && cache.set) {
        cache.set('metadata', server.metadata);
      }
    }

    if (server.orchestrator && typeof server.orchestrator._startPhase2BackgroundIndexer === 'function') {
      try {
        server.orchestrator._phase2IndexerInstance?.stop?.(false);
      } catch {
        // Best effort cleanup of any stale Phase 2 loop.
      }

      server.orchestrator._phase2IndexerInstance = null;
      server.orchestrator.totalPhase2Files = 0;
      await server.orchestrator._startPhase2BackgroundIndexer();
      result.phase2Restarted = true;
    }

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

async function invalidateIncrementalState(server) {
  if (!server?.projectPath) return;

  const { getRepository } = await import('#layer-c/storage/repository/index.js');
  const repo = getRepository(server.projectPath);
  const db = repo?.db || repo?.getDatabase?.();

  if (!db) return;

  try {
    db.prepare('DELETE FROM file_hashes').run();
  } catch {
    // file_hashes may not exist yet on older databases
  }

  try {
    db.prepare('UPDATE files SET hash = NULL WHERE hash IS NOT NULL').run();
  } catch {
    // files.hash may be absent on older databases
  }
}

async function stopOrchestrator(orchestrator) {
  logger.info('⏹️  Deteniendo orchestrator...');
  if (orchestrator) {
    try {
      await orchestrator.stop();
      logger.info('✅ Orchestrator detenido');
    } catch (err) {
      logger.warn('⚠️  Error deteniendo orchestrator:', err.message);
    }
  }
}

async function runFullPipeline(server, result) {
  logger.info('🔄 reanalyze=true — Ejecutando pipeline completo (LayerA + Cache + Orchestrator)...');

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
  }
}

async function fastRestartOrchestrator(server, result) {
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
  }
}

async function refreshRegistry(result) {
  try {
    const { refreshToolRegistry } = await import('../../mcp-http-server.js');
    await refreshToolRegistry();
    logger.info('🔄 Tool registry refreshed after restart');
    result.toolRegistryRefreshed = true;
  } catch (refreshErr) {
    logger.warn('⚠️  Tool registry refresh skipped:', refreshErr.message);
    result.toolRegistryRefreshed = false;
  }
}

