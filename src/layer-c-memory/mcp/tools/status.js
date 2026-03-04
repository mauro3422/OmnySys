/**
 * Tool: get_server_status
 * Returns the complete status of the OmnySys server
 */

import { getProjectMetadata } from '#layer-c/query/apis/project-api.js';
import { createLogger, getRecentLogs, clearRecentLogs } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:status');



export async function get_server_status(args, context) {
  const { orchestrator, cache, projectPath, server } = context;

  logger.info(`[Tool] get_server_status()`);

  // Siempre disponible: información básica del sistema
  const status = {
    initialized: server?.initialized || false,
    initializing: !!server && !server.initialized,
    project: projectPath,
    hotReloadTest: "v1-success",
    timestamp: new Date().toISOString()
  };

  // Información del orchestrator (si está disponible)
  if (orchestrator) {
    try {
      status.orchestrator = orchestrator.getStatus ? orchestrator.getStatus() : { status: 'initializing' };
    } catch (e) {
      status.orchestrator = { status: 'error', message: e.message };
    }
  } else {
    status.orchestrator = { status: 'not_ready', message: 'Orchestrator is initializing' };
  }

  // Metadata del proyecto (desde disco, siempre disponible)
  try {
    const metadata = await getProjectMetadata(projectPath);
    status.metadata = {
      totalFiles: metadata?.stats?.totalFiles || metadata?.totalFiles || 0,
      totalFunctions: metadata?.stats?.totalAtoms || metadata?.totalFunctions || 0,
      lastAnalyzed: metadata?.system_map_metadata?.analyzedAt || metadata?.indexedAt || null
    };

    // Live SQLite count — may differ from metadata if Phase 2 background indexer is still running
    try {
      const { getRepository } = await import('#layer-c/storage/repository/index.js');
      const repo = getRepository(projectPath);
      if (repo?.db) {
        const row = repo.db.prepare('SELECT COUNT(*) as n FROM atoms').get();
        status.metadata.liveAtomCount = row?.n || 0;
        status.metadata.liveFileCount = repo.db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms').get()?.n || 0;
      }
    } catch {
      // Repo not ready yet — skip live count
    }
  } catch (e) {
    status.metadata = { error: 'Metadata not available', message: e.message };
  }

  // Cache stats (si está disponible)
  if (cache) {
    try {
      status.cache = cache.getStats ? cache.getStats() : { status: 'initializing' };
    } catch (e) {
      status.cache = { status: 'error', message: e.message };
    }
  } else {
    status.cache = { status: 'not_ready', message: 'Cache is initializing' };
  }

  return status;
}

/**
 * Tool: get_recent_errors
 * Returns recent warnings/errors captured by the logger and clears them
 */
export async function get_recent_errors(args, context) {
  logger.info(`[Tool] get_recent_errors()`);

  const logs = getRecentLogs();
  clearRecentLogs();

  const warnings = logs.filter(l => l.level === 'warn');
  const errors = logs.filter(l => l.level === 'error');

  // Categorización inteligente de incidentes
  const incidents = {
    atomic: errors.filter(l => l.message.includes('atomic') || l.message.includes('AutoFix')).length,
    transaction: errors.filter(l => l.message.includes('transaction')).length,
    database: errors.filter(l => l.message.includes('SQLite') || l.message.includes('database')).length,
    others: 0
  };
  incidents.others = errors.length - (incidents.atomic + incidents.transaction + incidents.database);

  return {
    summary: {
      total: logs.length,
      warnings: warnings.length,
      errors: errors.length,
      incidents
    },
    logs: logs.map(l => ({
      level: l.level,
      message: l.message,
      time: new Date(l.time).toISOString()
    }))
  };
}
