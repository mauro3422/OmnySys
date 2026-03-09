/**
 * Returns cache statistics.
 *
 * In SQLite mode the manager may not populate `index.entries`, so we fall back
 * to persisted metadata to keep status telemetry truthful.
 */
export const getStats = (...args) => getStats(...args);
/**
 * Returns full cache statistics, including the RAM cache layer.
 */
export function getAllStats() {
  return {
    persistent: this.getStats(),
    ram: this.getRamStats()
  };
}
