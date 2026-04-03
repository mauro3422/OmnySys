/**
 * Canonical summary for the live atom/function update pipeline.
 */

import { normalizeCount } from './contract-helpers.js';

function resolveRepositoryIntegrity(status) {
  const repository = status?.repository || {};
  return repository.integrity || repository.status?.integrity || null;
}

function resolveQueueSize(status) {
  const repository = status?.repository || {};
  const journal = repository.journal || repository.status?.journal || {};
  return normalizeCount(journal.queued);
}

export function buildUpdateSurfaceSummary(status = {}) {
  if (!status || typeof status !== 'object') {
    return null;
  }

  const metadata = status.metadata || {};
  const watcher = status.watcher || {};
  const cache = status.cache || {};
  const integrity = resolveRepositoryIntegrity(status);
  const dbOpen = status.repository?.status?.dbOpen !== false;
  const integrityHealthy = integrity ? integrity.healthy !== false : true;
  const pendingChanges = normalizeCount(watcher.pendingChanges);
  const failedChanges = normalizeCount(watcher.failedChanges);
  const phase2PendingFiles = normalizeCount(metadata.phase2PendingFiles);
  const phase2CompletedFiles = normalizeCount(metadata.phase2CompletedFiles);
  const liveFileCount = normalizeCount(metadata.liveFileCount || metadata.totalFiles);
  const fileMirrorCount = normalizeCount(cache.files || metadata.liveFileCount || 0);
  const queuedMutations = resolveQueueSize(status);
  const dependencyTotal = normalizeCount(status.background?.graphCoverage?.dependenciesTotal);

  let state = 'synced';
  if (!dbOpen || !integrityHealthy) {
    state = 'degraded';
  } else if (pendingChanges > 0 || failedChanges > 0 || phase2PendingFiles > 0 || queuedMutations > 0) {
    state = 'syncing';
  }

  return {
    state,
    detail: `files=${liveFileCount} | mirror=${fileMirrorCount} | deps=${dependencyTotal} | pending=${phase2PendingFiles} | watcher=${pendingChanges}/${failedChanges} | journal=${queuedMutations} | integrity=${integrityHealthy ? 'ok' : 'fail'}`,
    source: 'atom/function update pipeline',
    summary: {
      dbOpen,
      integrityHealthy,
      queuedMutations,
      pendingChanges,
      failedChanges,
      phase2PendingFiles,
      phase2CompletedFiles,
      liveFileCount,
      fileMirrorCount,
      dependencyTotal,
      cacheStatus: cache.status || null
    }
  };
}

export default {
  buildUpdateSurfaceSummary
};
