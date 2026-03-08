/**
 * Tool: get_server_status
 * Returns the complete status of the OmnySys server.
 */

import { getProjectMetadata } from '#layer-c/query/apis/project-api.js';
import { createLogger } from '../../../utils/logger.js';
import { collectRecentNotifications, normalizeRecentNotifications } from '../core/recent-notifications.js';
import {
  buildCompilerReadinessStatus,
  buildCompilerStandardizationReport,
  discoverProjectSourceFiles,
  getSystemMapPersistenceCoverage,
  getMetadataSurfaceParity,
  getSharedStateContentionSummary,
  buildTelemetryProvenance,
  getFileImportEvidenceCoverage,
  getFileUniverseGranularity,
  getSemanticSurfaceGranularity,
  summarizeSemanticCanonicality,
  summarizePersistedScannedFileCoverage,
  syncPersistedScannedFileManifest,
  summarizeSignalConfidence,
  summarizeCompilerPolicyDrift
} from '../../../shared/compiler/index.js';

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

function buildBaseStatus(server, projectPath, phase2InProgress) {
  return {
    initialized: server?.initialized || false,
    initializing: !!server && !server.initialized,
    project: projectPath,
    hotReloadTest: 'v1-success',
    timestamp: new Date().toISOString(),
    telemetryMode: phase2InProgress ? 'fast_phase2' : 'full'
  };
}

function buildNodeVitals(server) {
  return {
    uptime: Math.round((Date.now() - server.startTime) / 1000),
    memory: process.memoryUsage(),
    activeHandles: (typeof process._getActiveHandles === 'function')
      ? process._getActiveHandles().length
      : 'N/A'
  };
}

function attachOrchestratorStatus(status, orchestrator) {
  if (orchestrator) {
    try {
      status.orchestrator = orchestrator.getStatus ? orchestrator.getStatus() : { status: 'initializing' };
    } catch (error) {
      status.orchestrator = { status: 'error', message: error.message };
    }
    return;
  }

  status.orchestrator = { status: 'not_ready', message: 'Orchestrator is initializing' };
}

function buildHotReloadStatus(server) {
  return server?.hotReloadManager?.getStats?.() || {
    isWatching: false,
    isReloading: false,
    runtimeRestartMode: server?.runtimeRestartMode || 'manual',
    pendingRuntimeRestart: {
      scheduled: !!server?._hotReloadRestartScheduled,
      files: Array.from(server?._pendingHotReloadRestartFiles || [])
    }
  };
}

async function loadNotifications(projectPath) {
  return normalizeRecentNotifications(await collectRecentNotifications(projectPath, {
    clearLoggerBuffer: false,
    watcherLimit: 20
  }));
}

function attachNotificationSignals(status, notifications) {
  status.recentNotifications = notifications;
  status.signalConfidence = notifications.signalConfidence || summarizeSignalConfidence(notifications.watcherAlerts || []);
}

function attachPhase2Status(status, server, cache, cachedMetadata, cachedCounts, phase2Status, notifications) {
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
  status.nodeVitals = buildNodeVitals(server);
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
  status.telemetryProvenance = buildTelemetryProvenance({
    source: 'status.phase2',
    phase2PendingFiles: phase2Status.pendingFiles,
    runtimeRestartMode: status.hotReload.runtimeRestartMode,
    pendingRuntimeRestartFiles: status.hotReload.pendingRuntimeRestart?.files || [],
    watcherLifecycle: notifications.watcherLifecycle
  });
}

async function loadMetadataStatus(projectPath) {
  try {
    const metadata = await getProjectMetadata(projectPath);
    const statusMetadata = {
      totalFiles: metadata?.stats?.totalFiles || metadata?.totalFiles || 0,
      totalFunctions: metadata?.stats?.totalAtoms || metadata?.totalFunctions || 0,
      lastAnalyzed: getLastAnalyzed(metadata)
    };

    try {
      const { getRepository } = await import('#layer-c/storage/repository/index.js');
      const repo = getRepository(projectPath);
      if (repo?.db) {
        statusMetadata.liveAtomCount = repo.db.prepare('SELECT COUNT(*) as n FROM atoms').get()?.n || 0;
        statusMetadata.liveFileCount = repo.db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms').get()?.n || 0;
        statusMetadata.phase2PendingFiles = repo.db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_phase2_complete = 0').get()?.n || 0;
        statusMetadata.phase2CompletedFiles = repo.db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_phase2_complete = 1').get()?.n || 0;
        statusMetadata.societiesCount = repo.db.prepare('SELECT COUNT(*) as n FROM societies').get()?.n || 0;
      }
    } catch {
      // Repo not ready yet; live counts remain omitted.
    }

    return statusMetadata;
  } catch (error) {
    return { error: 'Metadata not available', message: error.message };
  }
}

function attachCacheStatus(status, cache) {
  if (cache) {
    try {
      status.cache = cache.getStats ? cache.getStats() : { status: 'initializing' };
    } catch (error) {
      status.cache = { status: 'error', message: error.message };
    }
    return;
  }

  status.cache = { status: 'not_ready', message: 'Cache is initializing' };
}

async function attachDeepVitals(status, projectPath, server) {
  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(projectPath);
    if (!repo?.db) {
      return;
    }

    const sharedStateSummary = getSharedStateContentionSummary(repo.db);
    status.sharedState = {
      activeSocietiesBadge: sharedStateSummary.actorCount > 0 ? 'RADIOACTIVE' : 'CLEAN',
      actorCount: sharedStateSummary.actorCount,
      totalLinks: sharedStateSummary.totalLinks,
      maxContention: sharedStateSummary.maxContention,
      hottestKey: sharedStateSummary.hottestKey,
      topContentionKeys: sharedStateSummary.topContentionKeys
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

    status.compilerReadiness = buildCompilerReadinessStatus({
      phase2PendingFiles: status.metadata?.phase2PendingFiles ?? 0,
      societiesCount: status.metadata?.societiesCount ?? 0,
      runtimeSessions: server.sessions?.size || 0,
      persistentActive: activePersistentSessions.length,
      clientsWithDuplicates: dedupStats.clientsWithDuplicates || 0
    });
  } catch (error) {
    status.deepVitalsError = error.message;
  }
}

async function loadCompilerExplainability(projectPath, watcherAlerts = [], sharedState = {}) {
  try {
    const { scanCompilerPolicyDrift } = await import('../../../shared/compiler/index.js');
    const findings = await scanCompilerPolicyDrift(projectPath, { limit: 100 });
    const policySummary = summarizeCompilerPolicyDrift(findings);
    const scannedFilePaths = await discoverProjectSourceFiles(projectPath);
    await syncPersistedScannedFileManifest(projectPath, scannedFilePaths);
    const persistedFileCoverage = await summarizePersistedScannedFileCoverage(projectPath, scannedFilePaths);
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(projectPath);
    const fileImportEvidenceCoverage = repo?.db ? getFileImportEvidenceCoverage(repo.db) : null;
    const systemMapPersistenceCoverage = repo?.db ? getSystemMapPersistenceCoverage(repo.db) : null;
    const metadataSurfaceParity = repo?.db ? getMetadataSurfaceParity(repo.db) : null;
    const semanticSurfaceGranularity = repo?.db ? getSemanticSurfaceGranularity(repo.db) : null;
    const semanticCanonicality = summarizeSemanticCanonicality(semanticSurfaceGranularity);
    const fileUniverseGranularity = getFileUniverseGranularity({
      scannedFileTotal: persistedFileCoverage?.scannedFileTotal || 0,
      manifestFileTotal: persistedFileCoverage?.manifestFileTotal || 0,
      liveFileCount: repo?.db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms').get()?.n || 0
    });
    const standardization = buildCompilerStandardizationReport({
      policySummary,
      watcherAlerts,
      sharedState,
      persistedFileCoverage,
      fileImportEvidenceCoverage,
      systemMapPersistenceCoverage,
      metadataSurfaceParity,
      semanticSurfaceGranularity,
      fileUniverseGranularity,
      canonicalAdoptions: {
        centralityCoverage: true,
        sharedStateContention: true,
        scannedFileManifest: persistedFileCoverage.synchronized
      }
    });

    return {
      policySummary,
      standardization,
      persistedFileCoverage,
      fileImportEvidenceCoverage,
      systemMapPersistenceCoverage,
      metadataSurfaceParity,
      semanticCanonicality,
      semanticSurfaceGranularity,
      fileUniverseGranularity
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

export async function get_server_status(args, context) {
  const { orchestrator, cache, projectPath, server } = context;
  const phase2Status = getPhase2Status(orchestrator);
  const phase2InProgress = !!phase2Status?.inProgress;
  const cachedMetadata = getCachedMetadata(server, cache);
  const cachedCounts = getCachedCounts(cache, cachedMetadata);

  logger.info('[Tool] get_server_status()');

  const status = buildBaseStatus(server, projectPath, phase2InProgress);
  attachOrchestratorStatus(status, orchestrator);
  status.hotReload = buildHotReloadStatus(server);
  const notifications = await loadNotifications(projectPath);
  attachNotificationSignals(status, notifications);

  if (phase2InProgress) {
    attachPhase2Status(status, server, cache, cachedMetadata, cachedCounts, phase2Status, notifications);
    return status;
  }

  status.metadata = await loadMetadataStatus(projectPath);
  attachCacheStatus(status, cache);
  status.nodeVitals = buildNodeVitals(server);
  await attachDeepVitals(status, projectPath, server);
  status.telemetryProvenance = buildTelemetryProvenance({
    source: 'status.runtime',
    phase2PendingFiles: status.metadata?.phase2PendingFiles || 0,
    runtimeRestartMode: status.hotReload.runtimeRestartMode,
    pendingRuntimeRestartFiles: status.hotReload.pendingRuntimeRestart?.files || [],
    watcherLifecycle: notifications.watcherLifecycle
  });

  status.compilerExplainability = await loadCompilerExplainability(
    projectPath,
    notifications.watcherAlerts || [],
    status.sharedState || {}
  );

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
    watcherAlerts,
    signalConfidence: notifications.signalConfidence,
    provenance: notifications.provenance
  };
}
