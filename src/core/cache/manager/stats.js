/**
 * Returns cache statistics.
 *
 * In SQLite mode the manager may not populate `index.entries`, so we fall back
 * to persisted metadata to keep status telemetry truthful.
 */
export function getStats() {
  const entries = Object.values(this.index.entries);
  const metadata = this.index.metadata || {};
  const totalFiles = entries.length || metadata.totalFiles || 0;
  const staticAnalyzed = entries.length
    ? entries.filter((entry) => entry.staticAnalyzed || entry.staticVersion || entry.definitions?.length || entry.exports?.length).length
    : totalFiles;
  const llmAnalyzed = entries.length
    ? entries.filter((entry) => entry.llmAnalyzed || entry.llmVersion || entry.llmInsights).length
    : 0;

  return {
    totalFiles,
    totalAtoms: metadata.totalAtoms || 0,
    staticAnalyzed,
    llmAnalyzed,
    byChangeType: {
      none: entries.filter((entry) => entry.changeType === 'none').length,
      cosmetic: entries.filter((entry) => entry.changeType === 'cosmetic').length,
      static: entries.filter((entry) => entry.changeType === 'static').length,
      semantic: entries.filter((entry) => entry.changeType === 'semantic').length,
      critical: entries.filter((entry) => entry.changeType === 'critical').length
    }
  };
}

/**
 * Returns full cache statistics, including the RAM cache layer.
 */
export function getAllStats() {
  return {
    persistent: this.getStats(),
    ram: this.getRamStats()
  };
}
