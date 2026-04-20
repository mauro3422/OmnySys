import { createLogger } from '#utils/logger.js';
import { getRepositoryRetryDelay, isTransientDatabaseError } from '../repository-bridge-utils.js';
import { bridgeState, getProjectJournal } from './state.js';
import { REPOSITORY_MUTATION_DURABILITY } from './constants.js';
import { getRepositoryStatus } from './status.js';

const logger = createLogger('OmnySys:Storage:RepositoryBridge');

function scheduleRepositoryFlush(projectPath, delayMs = 100) {
  const { normalizedProjectPath } = getProjectJournal(projectPath);
  if (bridgeState.flushTimers.has(normalizedProjectPath)) {
    return;
  }

  const timer = setTimeout(async () => {
    bridgeState.flushTimers.delete(normalizedProjectPath);

    try {
      const result = await flushRepositoryMutationJournal(normalizedProjectPath);
      if (result?.retryable && result?.queued > 0) {
        scheduleRepositoryFlush(normalizedProjectPath, result.nextDelayMs ?? Math.min(delayMs * 2, 2000));
      }
    } catch (error) {
      logger.warn(`[RepositoryBridge] scheduled flush failed for ${normalizedProjectPath}: ${error.message}`);
      scheduleRepositoryFlush(normalizedProjectPath, Math.min(delayMs * 2, 2000));
    }
  }, delayMs);

  bridgeState.flushTimers.set(normalizedProjectPath, timer);
}

export function enqueueRepositoryMutation(projectPath, mutation) {
  const { normalizedProjectPath, journal } = getProjectJournal(projectPath);
  const entry = {
    key: mutation.key || mutation.label || `${Date.now()}`,
    label: mutation.label || mutation.key || 'repository-mutation',
    durability: mutation.durability || REPOSITORY_MUTATION_DURABILITY.DURABLE,
    metadata: mutation.metadata || {},
    run: mutation.run,
    attempts: 0,
    queuedAt: Date.now()
  };

  journal.set(entry.key, entry);
  logger.debug(
    `[RepositoryBridge] queued ${entry.label} for ${normalizedProjectPath}` +
    (entry.metadata?.filePath ? ` (${entry.metadata.filePath})` : '')
  );
  if (entry.durability === REPOSITORY_MUTATION_DURABILITY.DURABLE) {
    scheduleRepositoryFlush(normalizedProjectPath);
  }

  return entry;
}

export function getRepositoryMutationJournalSnapshot(projectPath) {
  const { normalizedProjectPath, journal } = getProjectJournal(projectPath);
  return {
    projectPath: normalizedProjectPath,
    queued: journal.size,
    entries: [...journal.values()].map((entry) => ({
      key: entry.key,
      label: entry.label,
      durability: entry.durability,
      queuedAt: entry.queuedAt,
      attempts: entry.attempts,
      metadata: entry.metadata
    }))
  };
}

export async function flushRepositoryMutationJournal(projectPath) {
  const status = getRepositoryStatus(projectPath);
  const { normalizedProjectPath, journal } = getProjectJournal(projectPath);

  if (!status.ready) {
    return {
      success: true,
      skipped: true,
      retryable: journal.size > 0,
      reason: status.reason,
      flushed: 0,
      failed: 0,
      queued: journal.size,
      state: status,
      nextDelayMs: journal.size > 0 ? 100 : null
    };
  }

  const entries = [...journal.values()].sort((left, right) => left.queuedAt - right.queuedAt);
  const replayed = [];
  let flushed = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      await entry.run(status.repo, status);
      journal.delete(entry.key);
      flushed++;
      replayed.push({ key: entry.key, label: entry.label });
    } catch (error) {
      entry.attempts++;
      if (isTransientDatabaseError(error)) {
        journal.set(entry.key, entry);
        logger.debug(`[RepositoryBridge] flush paused for ${normalizedProjectPath}: ${error.message}`);
        return {
          success: true,
          skipped: true,
          retryable: true,
          reason: error.message,
          flushed,
          failed,
          queued: journal.size,
          replayed,
          state: status,
          nextDelayMs: getRepositoryRetryDelay(entry.attempts + 1)
        };
      }

      failed++;
      replayed.push({ key: entry.key, label: entry.label, error: error.message });
      journal.delete(entry.key);
      logger.warn(`[RepositoryBridge] failed to replay ${entry.label} for ${normalizedProjectPath}: ${error.message}`);
    }
  }

  if (journal.size === 0) {
    bridgeState.journals.delete(normalizedProjectPath);
    const timer = bridgeState.flushTimers.get(normalizedProjectPath);
    if (timer) {
      clearTimeout(timer);
      bridgeState.flushTimers.delete(normalizedProjectPath);
    }
  }

  return {
    success: true,
    skipped: false,
    retryable: journal.size > 0,
    reason: null,
    flushed,
    failed,
    queued: journal.size,
    replayed,
    state: status,
    nextDelayMs: journal.size > 0 ? 100 : null
  };
}
