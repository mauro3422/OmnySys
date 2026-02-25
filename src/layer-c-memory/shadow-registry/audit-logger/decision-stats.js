/**
 * @fileoverview Decision Audit Logger - Statistics
 *
 * Calcula estadísticas de decisiones de auditoría.
 *
 * @module layer-c-memory/shadow-registry/audit-logger/decision-stats
 */

/**
 * Calcula estadísticas de decisiones
 * @param {Map} decisions - Mapa de decisiones
 * @returns {Object} Estadísticas
 */
export function calculateStats(decisions) {
  const stats = {
    total: decisions.size,
    byType: {},
    byFile: {},
    recent: []
  };

  for (const decision of decisions.values()) {
    // Por tipo
    stats.byType[decision.type] = (stats.byType[decision.type] || 0) + 1;

    // Por archivo
    stats.byFile[decision.filePath] = (stats.byFile[decision.filePath] || 0) + 1;
  }

  // Decisiones recientes (últimas 10)
  stats.recent = Array.from(decisions.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  return stats;
}

/**
 * Obtiene decisiones para un archivo específico
 * @param {Map} decisions - Mapa de decisiones
 * @param {string} filePath - Ruta del archivo
 * @returns {Array} Decisiones filtradas y ordenadas
 */
export function getDecisionsForFile(decisions, filePath) {
  return Array.from(decisions.values())
    .filter(d => d.filePath === filePath)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export default {
  calculateStats,
  getDecisionsForFile
};
