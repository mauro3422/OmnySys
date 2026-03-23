import { buildRestartLifecycleGuidance } from '../../shared/compiler/index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:restart:helpers');

export async function invalidateIncrementalState(server) {
  if (!server?.projectPath) return;

  const { getRepository } = await import('#layer-c/storage/repository/index.js');
  const repo = getRepository(server.projectPath);
  const db = repo?.db || repo?.getDatabase?.();

  if (!db) return;

  try {
    db.prepare('DELETE FROM file_hashes').run();
  } catch {}

  try {
    db.prepare('UPDATE files SET hash = NULL WHERE hash IS NOT NULL').run();
  } catch {}
}

export async function stopOrchestrator(orchestrator) {
  logger.info('Stopping orchestrator...');
  if (orchestrator) {
    try {
      await orchestrator.stop();
      logger.info('Orchestrator stopped');
    } catch (err) {
      logger.warn('Error stopping orchestrator:', err.message);
    }
  }
}

export async function runFullPipeline(server, result) {
  logger.info('reanalyze=true: running full pipeline (LayerA + Cache + Orchestrator)...');

  if (server._healthBeacon) {
    try {
      await new Promise((resolve) => server._healthBeacon.close(resolve));
      server._healthBeacon = null;
    } catch {
      server._healthBeacon = null;
    }
  }

  server.initialized = false;
  server.orchestrator = null;
  server.cache = null;
  server.startTime = Date.now();

  try {
    const { InitializationPipeline } = await import('./core/initialization/pipeline.js');
    const { LLMSetupStep, LayerAAnalysisStep, OrchestratorInitStep, CacheInitStep, ReadyStep } =
      await import('./core/initialization/steps/index.js');

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
      logger.info('Full pipeline completed');
      result.success = true;
      result.componentsRestarted = ['LayerA', 'Cache', 'LLM', 'Orchestrator'];
    } else {
      throw new Error(`Pipeline failed at: ${initResult.failedAt || initResult.haltedAt}`);
    }
  } catch (pipelineErr) {
    logger.error('Error in full pipeline:', pipelineErr.message);
    result.success = false;
    result.error = pipelineErr.message;
  }
}

export async function fastRestartOrchestrator(server, result) {
  logger.info('Fast restart: restarting orchestrator only (no LayerA)...');
  try {
    const { OrchestratorInitStep } = await import('./core/initialization/steps/index.js');
    const step = new OrchestratorInitStep();
    await step.execute(server);
    server.initialized = true;
    logger.info('Orchestrator restarted');
    result.success = true;
    result.componentsRestarted = ['Orchestrator'];
    result.message = 'Fast restart complete. Orchestrator restarted, tool registry refreshed. No Layer A reindex.';
  } catch (orchErr) {
    logger.error('Error restarting orchestrator:', orchErr.message);
    result.success = false;
    result.error = orchErr.message;
  }
}

export async function refreshRegistry(result, refreshToolRegistryFn) {
  try {
    await refreshToolRegistryFn?.(logger);
    logger.info('Tool registry refreshed after restart');
    result.toolRegistryRefreshed = true;
  } catch (refreshErr) {
    logger.warn('Tool registry refresh skipped:', refreshErr.message);
    result.toolRegistryRefreshed = false;
  }
}

export async function refreshToolRegistrySafely(refreshToolRegistryFn, successMessage, failureMessage = 'Tool registry refresh skipped') {
  try {
    await refreshToolRegistryFn?.(logger);
    if (successMessage) {
      logger.info(successMessage);
    }
    return true;
  } catch (refreshErr) {
    logger.warn(`${failureMessage}: ${refreshErr.message}`);
    return false;
  }
}

export function buildProxyRestartResult({ clearCache, reanalyze, clearCacheOnly, reindexOnly }) {
  return {
    success: true,
    restarting: true,
    restartType: 'true_process_restart',
    lifecycle: buildRestartLifecycleGuidance({
      restartType: 'true_process_restart',
      proxyMode: true,
      clearCache,
      reanalyze,
      reindexOnly,
      clearCacheOnly
    }),
    clearCache,
    reanalyze,
    timestamp: new Date().toISOString(),
    message: 'Proxy-managed restart requested.',
    esmCacheCleared: true
  };
}
