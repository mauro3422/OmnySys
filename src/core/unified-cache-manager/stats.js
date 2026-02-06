/**
 * Obtiene estadísticas del caché
 */
export function getStats() {
  const entries = Object.values(this.index.entries);

  return {
    totalFiles: entries.length,
    staticAnalyzed: entries.filter(e => e.staticAnalyzed).length,
    llmAnalyzed: entries.filter(e => e.llmAnalyzed).length,
    byChangeType: {
      none: entries.filter(e => e.changeType === 'none').length,
      cosmetic: entries.filter(e => e.changeType === 'cosmetic').length,
      static: entries.filter(e => e.changeType === 'static').length,
      semantic: entries.filter(e => e.changeType === 'semantic').length,
      critical: entries.filter(e => e.changeType === 'critical').length
    }
  };
}

/**
 * Obtiene estadísticas completas (persistente + RAM)
 */
export function getAllStats() {
  return {
    persistent: this.getStats(),
    ram: this.getRamStats()
  };
}
