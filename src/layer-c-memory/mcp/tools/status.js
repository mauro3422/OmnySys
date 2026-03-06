/**
 * Tool: get_server_status
 * Returns the complete status of the OmnySys server.
 */

import { getProjectMetadata } from '#layer-c/query/apis/project-api.js';
import { createLogger } from '../../../utils/logger.js';
import { collectRecentNotifications, normalizeRecentNotifications } from '../core/recent-notifications.js';
import { buildCompilerReadinessStatus } from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:status');

function getCachedMetadata(server, cache) {
  return server?.metadata || cache?.get?.('metadata') || {};
}

function getCachedCounts(cache, fallbackMetadata) {
  return {
    totalFiles: cache?.index?.metadata?.totalFiles || fallbackMetadata?.stats?.totalFiles || fallbackMetadata?.totalFiles || 0,
    totalAtoms: cache?.index?.metadata?.totalAtoms || fallbackMetadata?.stats?.totalAtoms || fallbackMetadata?.totalFunctions || fallbackMetadata?.totalAtoms || 0
  };
}

function getLastAnalyzed(metadata) {
  return metadata?.system_map_metadata?.analyzedAt || metadata?.core_metadata?.enhancedAt || metadata?.indexedAt || null;
}

function getPhase2Status(orchestrator) {
  return orchestrator?.phase2Status || null;
}

export async function get_server_status(args, context) {
  const { orchestrator, cache, projectPath, server } = context;
  const phase2Status = getPhase2Status(orchestrator);
  const phase2InProgress = !!phase2Status?.inProgress;
  const cachedMetadata = getCachedMetadata(server, cache);
  const cachedCounts = getCachedCounts(cache, cachedMetadata);

  logger.info('[Tool] get_server_status()');

  const status = {
    initialized: server?.initialized || false,
    initializing: !!server && !server.initialized,
    project: projectPath,
    hotReloadTest: 'v1-success',
    timestamp: new Date().toISOString(),
    telemetryMode: phase2InProgress ? 'fast_phase2' : 'full'
  };

  if (orchestrator) {
    try {
      status.orchestrator = orchestrator.getStatus ? orchestrator.getStatus() : { status: 'initializing' };
    } catch (error) {
      status.orchestrator = { status: 'error', message: error.message };
    }
  } else {
    status.orchestrator = { status: 'not_ready', message: 'Orchestrator is initializing' };
  }

  if (phase2InProgress) {
    status.metadata = {
      totalFiles: cachedCounts.totalFiles,
      totalFunctions: cachedCounts.totalAtoms,
      lastAnalyzed: getLastAnalyzed(cachedMetadata),
      liveAtomCount: cachedCounts.totalAtoms,
      liveFileCount: cachedCounts.totalFiles,
      phase2PendingFiles: phase2Status.pendingFiles,
      phase2CompletedFiles: phase2Status.completedFiles,
      societiesCount: null
    };

    status.cache = cache?.getStats ? cache.getStats() : { status: 'initializing' };
    status.nodeVitals = {
      uptime: Math.round((Date.now() - server.startTime) / 1000),
      memory: process.memoryUsage(),
      activeHandles: (typeof process._getActiveHandles === 'function')
        ? process._getActiveHandles().length
        : 'N/A'
    };

    status.sharedState = {
      status: 'settling',
      message: 'Phase 2 deep scan in progress; global semantic metrics may lag.'
    };

    status.background = {
      phase2PendingFiles: phase2Status.pendingFiles,
      phase2CompletedFiles: phase2Status.completedFiles,
      societiesCount: null,
      phase2: phase2Status
    };

    status.mcpSessions = {
      totalActive: server.sessions?.size || 0,
      totalPersistent: null,
      totalPersistentActive: null,
      uniqueClients: server.sessions?.size || 0,
      clientsWithDuplicates: null,
      health: (server.sessions?.size || 0) > 20 ? 'STRESSED' : 'HEALTHY'
    };

    status.compilerReadiness = {
      ready: false,
      checks: {
        phase2Complete: false,
        societiesReady: false,
        dedupHealthy: true,
        sessionCountsAligned: true
      },
      warnings: [
        `Phase 2 deep scan still running (${phase2Status.processedFiles}/${phase2Status.totalFiles}, ${phase2Status.percentComplete}%).`,
        'Global metrics are still settling; use atom/file-level queries for fresh detail.'
      ]
    };

    return status;
  }

  try {
    const metadata = await getProjectMetadata(projectPath);
    status.metadata = {
      totalFiles: metadata?.stats?.totalFiles || metadata?.totalFiles || 0,
      totalFunctions: metadata?.stats?.totalAtoms || metadata?.totalFunctions || 0,
      lastAnalyzed: getLastAnalyzed(metadata)
    };

    try {
      const { getRepository } = await import('#layer-c/storage/repository/index.js');
      const repo = getRepository(projectPath);
      if (repo?.db) {
        status.metadata.liveAtomCount = repo.db.prepare('SELECT COUNT(*) as n FROM atoms').get()?.n || 0;
        status.metadata.liveFileCount = repo.db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms').get()?.n || 0;
        status.metadata.phase2PendingFiles = repo.db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_phase2_complete = 0').get()?.n || 0;
        status.metadata.phase2CompletedFiles = repo.db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_phase2_complete = 1').get()?.n || 0;
        status.metadata.societiesCount = repo.db.prepare('SELECT COUNT(*) as n FROM societies').get()?.n || 0;
      }
    } catch {
      // Repo not ready yet; live counts remain omitted.
    }
  } catch (error) {
    status.metadata = { error: 'Metadata not available', message: error.message };
  }

  if (cache) {
    try {
      status.cache = cache.getStats ? cache.getStats() : { status: 'initializing' };
    } catch (error) {
      status.cache = { status: 'error', message: error.message };
    }
  } else {
    status.cache = { status: 'not_ready', message: 'Cache is initializing' };
  }

  status.nodeVitals = {
    uptime: Math.round((Date.now() - server.startTime) / 1000),
    memory: process.memoryUsage(),
    activeHandles: (typeof process._getActiveHandles === 'function')
      ? process._getActiveHandles().length
      : 'N/A'
  };

  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(projectPath);
    if (repo?.db) {
      const societies = repo.db.prepare(`
        SELECT COUNT(DISTINCT source_id) as actors, COUNT(*) as links
        FROM atom_relations
        WHERE relation_type = 'shares_state'
      `).get();

      const topStateKeys = repo.db.prepare(`
        SELECT json_extract(context_json, '$.key') as key, COUNT(*) as count
        FROM atom_relations
        WHERE relation_type = 'shares_state'
        GROUP BY key
        ORDER BY count DESC
        LIMIT 5
      `).all();

      status.sharedState = {
        activeSocietiesBadge: societies.actors > 0 ? 'RADIOACTIVE' : 'CLEAN',
        actorCount: societies.actors,
        totalLinks: societies.links,
        topContentionKeys: topStateKeys
      };

      status.background = {
        phase2PendingFiles: repo.db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_phase2_complete = 0').get()?.n || 0,
        societiesCount: repo.db.prepare('SELECT COUNT(*) as n FROM societies').get()?.n || 0
      };

      const { sessionManager } = await import('../core/session-manager.js');
      const persistentSessions = sessionManager.getAllSessions(false);
      const activePersistentSessions = sessionManager.getAllSessions(true);
      const dedupStats = sessionManager.getDedupStats();
      status.mcpSessions = {
        totalActive: server.sessions?.size || 0,
        totalPersistent: persistentSessions.length,
        totalPersistentActive: activePersistentSessions.length,
        uniqueClients: dedupStats.uniqueClients || 0,
        clientsWithDuplicates: dedupStats.clientsWithDuplicates || 0,
        health: (server.sessions?.size || 0) > 20 ? 'STRESSED' : 'HEALTHY'
      };

      const phase2PendingFiles = status.metadata?.phase2PendingFiles ?? 0;
      const societiesCount = status.metadata?.societiesCount ?? 0;
      const runtimeSessions = server.sessions?.size || 0;
      const persistentActive = activePersistentSessions.length;
      const clientsWithDuplicates = dedupStats.clientsWithDuplicates || 0;

      status.compilerReadiness = buildCompilerReadinessStatus({
        phase2PendingFiles,
        societiesCount,
        runtimeSessions,
        persistentActive,
        clientsWithDuplicates
      });
    }
  } catch (error) {
    status.deepVitalsError = error.message;
  }

  return status;
}

/**
 * Tool: get_recent_errors
 * Returns recent warnings/errors captured by the logger and clears them.
 */
export async function get_recent_errors(args, context) {
  logger.info('[Tool] get_recent_errors()');
  const notifications = normalizeRecentNotifications(await collectRecentNotifications(context.projectPath, {
    clearLoggerBuffer: true,
    watcherLimit: 20
  }));
  const logs = notifications.logs || [];
  const watcherAlerts = notifications.watcherAlerts || [];
  const warnings = logs.filter((entry) => entry.level === 'warn');
  const errors = logs.filter((entry) => entry.level === 'error');
  const watcherHigh = watcherAlerts.filter((entry) => entry.severity === 'high').length;
  const watcherWarn = watcherAlerts.filter((entry) => entry.severity !== 'high').length;

  const incidents = {
    atomic: errors.filter((entry) => entry.message.includes('atomic') || entry.message.includes('AutoFix')).length,
    transaction: errors.filter((entry) => entry.message.includes('transaction')).length,
    database: errors.filter((entry) => entry.message.includes('SQLite') || entry.message.includes('database')).length,
    others: 0
  };
  incidents.others = errors.length - (incidents.atomic + incidents.transaction + incidents.database);

  return {
    summary: {
      total: notifications.count,
      warnings: warnings.length + watcherWarn,
      errors: errors.length + watcherHigh,
      incidents
    },
    logs: logs.map((entry) => ({
      level: entry.level,
      message: entry.message,
      time: new Date(entry.time).toISOString()
    })),
    watcherAlerts
  };
}
