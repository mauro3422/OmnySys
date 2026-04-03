/**
 * @fileoverview repository-bridge.js
 *
 * Canonical bridge between runtime subsystems and the SQLite repository.
 *
 * Rule:
 * - Rebuildable reads/writes should skip when SQLite is unavailable.
 * - Durable mutations should queue in-memory and flush once the repository becomes ready again.
 *
 * @module storage/repository/repository-bridge
 */

import { isMainThread } from 'worker_threads';
import { createLogger } from '#utils/logger.js';
import { connectionManager } from '../database/connection.js';
import { RepositoryFactory } from './repository-factory.js';
import {
  getRepositoryRetryDelay,
  isTransientDatabaseError,
  isRepositoryReady,
  retryUntilAvailable
} from './repository-bridge-utils.js';
import {
  bridgeState,
  getProjectJournal,
  normalizeProjectPath
} from './repository-bridge-state.js';

const logger = createLogger('OmnySys:Storage:RepositoryBridge');
export const REPOSITORY_MUTATION_DURABILITY = Object.freeze({
  DURABLE: 'durable',
  REBUILDABLE: 'rebuildable'
});
export { isRepositoryReady };

async function retryMutationUntilAvailable(projectPath, mutation, retryOptions = {}) {
  const attempts = Math.max(1, retryOptions.maxRetries ?? 5);
  const baseDelayMs = Math.max(1, retryOptions.baseDelayMs ?? 50);
  const maxDelayMs = Math.max(baseDelayMs, retryOptions.maxDelayMs ?? 500);

  try {
    const result = await retryUntilAvailable({
      attempts,
      baseDelayMs,
      maxDelayMs,
      shouldRetry: isTransientDatabaseError,
      operation: async () => {
        const status = getRepositoryStatus(projectPath);
        if (!status.ready) {
          throw new Error(status.reason || 'repository is not ready');
        }

        const mutationResult = await mutation.run(status.repo, status);
        return { state: status, result: mutationResult };
      }
    });

    return {
      success: true,
      queued: false,
      skipped: false,
      reason: null,
      state: result.state,
      result: result.result
    };
  } catch (error) {
    if (!isTransientDatabaseError(error)) {
      throw error;
    }

    return {
      success: false,
      queued: false,
      skipped: false,
      reason: error?.message || 'repository mutation retry exhausted',
      state: getRepositoryStatus(projectPath),
      result: null,
      error: error?.message || 'repository mutation retry exhausted'
    };
  }
}

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

export function getRepositoryStatus(projectPath) {
  const repo = RepositoryFactory.getInstance(projectPath);
  const normalizedProjectPath = normalizeProjectPath(projectPath);
  const integrity = connectionManager.getIntegrityStatus?.() || repo?.integrity || null;
  const ready = isRepositoryReady(repo) && integrity?.healthy !== false;
  const dbOpen = !!(repo?.db && repo.db.open !== false);
  const initialized = !!repo?.initialized;
  const reason = ready
    ? null
    : !repo
      ? 'repository is not initialized'
      : !initialized
        ? 'database is not initialized'
        : !dbOpen
          ? 'database connection is not open'
          : integrity?.healthy === false
            ? integrity.summary || 'database integrity probe failed'
          : 'repository is not ready';

  return { projectPath: normalizedProjectPath, ready, initialized, dbOpen, reason, integrity, repo };
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

export async function runRepositoryMutation(projectPath, mutation, options = {}) {
  const durability = options.durability || REPOSITORY_MUTATION_DURABILITY.REBUILDABLE;
  const status = getRepositoryStatus(projectPath);

  if (status.ready) {
    try {
      const result = await mutation.run(status.repo, status);
      return { success: true, queued: false, skipped: false, reason: null, state: status, result };
    } catch (error) {
      if (durability === REPOSITORY_MUTATION_DURABILITY.DURABLE && isTransientDatabaseError(error)) {
        if (!isMainThread) {
          return await retryMutationUntilAvailable(projectPath, mutation, options.retryOptions || {});
        }

        enqueueRepositoryMutation(projectPath, {
          ...mutation,
          durability,
          metadata: { ...(mutation.metadata || {}), lastError: error.message }
        });
        return { success: true, queued: true, skipped: false, reason: error.message, state: status, result: null };
      }
      throw error;
    }
  }

  if (durability === REPOSITORY_MUTATION_DURABILITY.DURABLE) {
    if (!isMainThread) {
      return {
        success: false,
        queued: false,
        skipped: true,
        reason: status.reason,
        state: status,
        result: null,
        error: status.reason
      };
    }

    enqueueRepositoryMutation(projectPath, mutation);
    return { success: true, queued: true, skipped: false, reason: status.reason, state: status, result: null };
  }

  return { success: true, queued: false, skipped: true, reason: status.reason, state: status, result: null };
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
