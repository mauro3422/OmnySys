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
import { statsPool } from '../../../../../shared/utils/stats-pool.js';
export const getStats = (...args) => statsPool.getStats('recovery-handler', ...args);
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
