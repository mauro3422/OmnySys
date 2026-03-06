import { createLogger } from '../../utils/logger.js';
import { getRepository } from '#layer-c/storage/repository/index.js';

const logger = createLogger('OmnySys:storage');

/**
 * Initializes the cache using SQLite as the primary source of truth.
 */
export async function initialize() {
  try {
    const repo = getRepository(this.projectPath);

    if (!repo || !repo.db) {
      logger.warn('SQLite not available, cache will be empty');
      this.loaded = true;
      return;
    }

    const stats = repo.db.prepare(`
        SELECT
            COUNT(*) as atomsCount,
            COUNT(DISTINCT file_path) as filesCount
        FROM atoms
    `).get();

    this.index.metadata.totalFiles = stats?.filesCount || 0;
    this.index.metadata.totalAtoms = stats?.atomsCount || 0;
    this.index.metadata.totalDependencies = 0;

    this.loaded = true;
    logger.info(`UnifiedCache: ${this.index.metadata.totalAtoms} atoms indexed (from SQLite)`);
  } catch (error) {
    logger.warn('Failed to initialize unified cache:', error.message);
  }
}

/**
 * Loads the legacy on-disk index.
 * Deprecated: SQLite is now the source of truth.
 */
export async function loadIndex() {
  this.index.entries = {};
}

/**
 * Saves the legacy on-disk index.
 * Deprecated: SQLite is now the source of truth.
 */
export async function saveIndex() {
  return;
}
