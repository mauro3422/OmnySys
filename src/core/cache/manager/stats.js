/**
 * Returns cache statistics.
 *
 * In SQLite mode the manager may not populate `index.entries`, so we fall back
 * to persisted metadata to keep status telemetry truthful.
 */
import { statsPool } from '../../../shared/utils/stats-pool.js';
export const getStats = (...args) => statsPool.getStats('cache', ...args);
/**
 * Returns full cache statistics, including the RAM cache layer.
 */
export function getAllStats() {
  return {
    persistent: this.getStats(),
    ram: this.getRamStats()
  };
}
