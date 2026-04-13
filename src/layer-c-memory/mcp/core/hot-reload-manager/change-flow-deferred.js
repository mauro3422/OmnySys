import { createLogger } from '../../../utils/logger.js';
import { buildCompilerReadinessStatus, getMcpSessionSummary } from '../../../../shared/compiler/index.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { sessionManager } from '../manager.js';
import { isMutationBatchActive } from '../shared/mutation-batch.js';

const logger = createLogger('OmnySys:hot-reload');

export function shouldDeferChange(server) {
  const runtimeSessionCount = server?.sessions?.size || 0;
  const sessionDb = server?.projectPath ? getRepository(server.projectPath)?.db || null : null;
  const sessionSummary = getMcpSessionSummary(sessionManager, {
    runtimeSessionCount,
    sessionDb
  });
  const readiness = buildCompilerReadinessStatus({
    phase2PendingFiles: server?.metadata?.phase2PendingFiles ?? server?.orchestrator?.phase2Status?.pendingFiles ?? 0,
    societiesCount: server?.metadata?.societiesCount ?? 0,
    runtimeSessions: sessionSummary.runtimeSessions ?? runtimeSessionCount,
    persistentActive: sessionSummary.totalPersistentActive ?? 0,
    clientsWithDuplicates: sessionSummary.clientsWithDuplicates ?? 0,
    actionableDuplicateClients: sessionSummary.actionableDuplicateClients ?? 0,
    toleratedDuplicateClients: sessionSummary.toleratedDuplicateClients ?? 0,
    sessionCountDrift: sessionSummary.sessionCountDrift,
    clientSyncState: sessionSummary.clientSyncState,
    clientSyncReason: sessionSummary.clientSyncReason
  });
  return !readiness.ready || isServerIndexing(server) || isMutationBatchActive(server) || !!server?.orchestrator?.phase2Status?.inProgress;
}

export function isServerIndexing(server) {
  return !!server?.orchestrator?.isIndexing || !!server?.isIndexing;
}

export function queueDeferredChange(server, payload, drainDeferredChanges) {
  if (!server || !payload?.filename) {
    return;
  }

  const queue = ensureDeferredChangeQueue(server);
  queue.set(payload.filename, {
    eventType: payload.eventType,
    filename: payload.filename,
    server: payload.server,
    classifier: payload.classifier,
    reloadHandler: payload.reloadHandler,
    recoveryContext: payload.recoveryContext,
    queuedAt: Date.now()
  });

  scheduleDeferredDrain(server, drainDeferredChanges);
}

export function scheduleDeferredDrain(server, drainDeferredChanges) {
  if (!server || server._hotReloadDeferredDrainTimer) {
    return;
  }

  server._hotReloadDeferredDrainTimer = setTimeout(() => {
    server._hotReloadDeferredDrainTimer = null;
    drainDeferredChanges(server);
  }, 1000);

  server._hotReloadDeferredDrainTimer?.unref?.();
}

export function drainDeferredChanges(server, processReloadableChange, getChangePriority) {
  const queue = server._pendingHotReloadChanges;
  if (!queue || queue.size === 0) {
    return;
  }

  if (shouldDeferChange(server) || server?.hotReloadManager?.reloadHandler?.isReloading) {
    if (server && !server._hotReloadDeferredDrainTimer) {
      server._hotReloadDeferredDrainTimer = setTimeout(() => {
        server._hotReloadDeferredDrainTimer = null;
        drainDeferredChanges(server, processReloadableChange, getChangePriority);
      }, 1000);

      server._hotReloadDeferredDrainTimer?.unref?.();
    }
    return;
  }

  const queuedChanges = Array.from(queue.values());
  queue.clear();

  queuedChanges.sort((left, right) => {
    const priority = getChangePriority(right.filename) - getChangePriority(left.filename);
    return priority !== 0 ? priority : left.queuedAt - right.queuedAt;
  });

  for (const change of queuedChanges) {
    processReloadableChange({
      ...change,
      server
    });
  }
}

function ensureDeferredChangeQueue(server) {
  if (!server._pendingHotReloadChanges) {
    server._pendingHotReloadChanges = new Map();
  }

  return server._pendingHotReloadChanges;
}

export function getChangePriority(filename) {
  const normalized = String(filename || '').replace(/\\/g, '/');
  if (/(^|[\\/])layer-c-memory[\\/]mcp[\\/].*\.js$/i.test(normalized)) return 4;
  if (/(^|[\\/])shared[\\/]compiler[\\/].*\.js$/i.test(normalized)) return 3;
  if (/(^|[\\/])layer-a-static[\\/].*\.js$/i.test(normalized)) return 2;
  return 1;
}
