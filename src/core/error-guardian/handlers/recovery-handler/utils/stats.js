/**
 * @fileoverview Stats Utilities
 * 
 * Utilidades para estadísticas de recuperación.
 * 
 * @module core/error-guardian/handlers/recovery-handler/utils/stats
 */

/**
 * Obtiene estadísticas de recuperación
 * @param {Object} stats - Estadísticas internas
 * @returns {Object} Copia de estadísticas
 */
export function getStats(stats) {
  return { ...stats };
}

/**
 * Reset statistics
 * @returns {Object} Estadísticas reseteadas
 */
export function resetStats() {
  return {
    totalRecoveries: 0,
    bySeverity: {},
    byAction: {},
    failedRecoveries: 0
  };
}
