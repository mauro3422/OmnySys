/**
 * Summarizes the live update pipeline after atom/function changes.
 */

function toCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveRepositoryIntegrity(status) {
  const repository = status?.repository || {};
  return repository.integrity || repository.status?.integrity || null;
}

function resolveQueueSize(status) {
  const repository = status?.repository || {};
  const journal = repository.journal || repository.status?.journal || {};
  return toCount(journal.queued);
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
  const pendingChanges = toCount(watcher.pendingChanges);
  const failedChanges = toCount(watcher.failedChanges);
  const phase2PendingFiles = toCount(metadata.phase2PendingFiles);
  const phase2CompletedFiles = toCount(metadata.phase2CompletedFiles);
  const liveFileCount = toCount(metadata.liveFileCount || metadata.totalFiles);
  const fileMirrorCount = toCount(cache.files || metadata.liveFileCount || 0);
  const queuedMutations = resolveQueueSize(status);
  const dependencyTotal = toCount(status.background?.graphCoverage?.dependenciesTotal);

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
