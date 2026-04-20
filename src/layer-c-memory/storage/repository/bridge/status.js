import { connectionManager } from '../../database/connection.js';
import { RepositoryFactory } from '../repository-factory.js';
import { isRepositoryReady } from '../repository-bridge-utils.js';
import { normalizeProjectPath } from './state.js';

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
