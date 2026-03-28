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

import { resolve } from 'path';
import { createLogger } from '#utils/logger.js';
import { RepositoryFactory } from './repository-factory.js';

const logger = createLogger('OmnySys:Storage:RepositoryBridge');
const bridgeState = {
  journals: new Map(),
  flushTimers: new Map()
};

export const REPOSITORY_MUTATION_DURABILITY = Object.freeze({
  DURABLE: 'durable',
  REBUILDABLE: 'rebuildable'
});

function normalizeProjectPath(projectPath) {
  const raw = String(projectPath || '').trim();
  if (!raw) return '__default__';
  return resolve(raw).replace(/\\/g, '/');
}

function isTransientDatabaseError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'SQLITE_BUSY' ||
    error?.code === 'SQLITE_LOCKED' ||
    message.includes('database connection is not open') ||
    message.includes('database is locked') ||
    message.includes('database is busy')
  );
}

function getProjectJournal(projectPath) {
  const normalizedProjectPath = normalizeProjectPath(projectPath);
  let journal = bridgeState.journals.get(normalizedProjectPath);
  if (!journal) {
    journal = new Map();
    bridgeState.journals.set(normalizedProjectPath, journal);
  }
  return { normalizedProjectPath, journal };
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
      if (result?.queued > 0 && (result?.skipped || result?.failed > 0)) {
        scheduleRepositoryFlush(normalizedProjectPath, Math.min(delayMs * 2, 2000));
      }
    } catch (error) {
      logger.warn(`[RepositoryBridge] scheduled flush failed for ${normalizedProjectPath}: ${error.message}`);
      scheduleRepositoryFlush(normalizedProjectPath, Math.min(delayMs * 2, 2000));
    }
  }, delayMs);

  bridgeState.flushTimers.set(normalizedProjectPath, timer);
}

export function isRepositoryReady(repo) {
  return !!(repo?.initialized && repo?.db && repo.db.open !== false);
}

export function getRepositoryStatus(projectPath) {
  const repo = RepositoryFactory.getInstance(projectPath);
  const normalizedProjectPath = normalizeProjectPath(projectPath);
  const ready = isRepositoryReady(repo);
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
          : 'repository is not ready';

  return { projectPath: normalizedProjectPath, ready, initialized, dbOpen, reason, repo };
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

export function getRepositoryDiagnostics(projectPath) {
  const status = getRepositoryStatus(projectPath);
  const journalSnapshot = getRepositoryMutationJournalSnapshot(projectPath);
  const queuedDurable = journalSnapshot.entries.filter((entry) => entry.durability === REPOSITORY_MUTATION_DURABILITY.DURABLE).length;
  const issues = [];
  const recommendations = [];

  if (!status.initialized) {
    issues.push('repository_not_initialized');
    recommendations.push('Initialize the repository before running durable mutations.');
  }

  if (!status.dbOpen) {
    issues.push('database_closed');
    recommendations.push('Reopen or reinitialize SQLite, then flush the repository mutation journal.');
  }

  if (journalSnapshot.queued > 0) {
    issues.push('queued_mutations_pending');
    recommendations.push('Flush the repository mutation journal after SQLite is ready.');
  }

  if (status.ready && journalSnapshot.queued === 0) {
    recommendations.push('Repository is healthy and ready for immediate writes.');
  }

  const health = !status.ready
    ? 'degraded'
    : journalSnapshot.queued > 0
      ? 'degraded'
      : 'healthy';

  return {
    health,
    status,
    journal: journalSnapshot,
    queuedDurable,
    issues,
    recommendations
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
    enqueueRepositoryMutation(projectPath, mutation);
    return { success: true, queued: true, skipped: false, reason: status.reason, state: status, result: null };
  }

  return { success: true, queued: false, skipped: true, reason: status.reason, state: status, result: null };
}

export async function flushRepositoryMutationJournal(projectPath) {
  const status = getRepositoryStatus(projectPath);
  const { normalizedProjectPath, journal } = getProjectJournal(projectPath);

  if (!status.ready) {
    return { success: true, skipped: true, reason: status.reason, flushed: 0, failed: 0, queued: journal.size, state: status };
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
        scheduleRepositoryFlush(normalizedProjectPath, Math.min(100 * (entry.attempts + 1), 2000));
        return { success: true, skipped: true, reason: error.message, flushed, failed, queued: journal.size, replayed, state: status };
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

  return { success: true, skipped: false, reason: null, flushed, failed, queued: journal.size, replayed, state: status };
}
