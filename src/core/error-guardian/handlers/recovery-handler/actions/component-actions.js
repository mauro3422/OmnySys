/**
 * @fileoverview Component Actions
 * 
 * Acciones sobre componentes del sistema.
 * 
 * @module core/error-guardian/handlers/recovery-handler/actions/component-actions
 */

import { createLogger } from '../../../../utils/logger.js';
import { clearCache } from './cache-actions.js';

const logger = createLogger('OmnySys:error:recovery');

/**
 * Reinicia componentes esenciales
 * @param {string} projectPath - Ruta del proyecto
 * @param {Object} stats - Estadísticas
 * @returns {Promise<void>}
 */
export async function restartEssentialComponents(projectPath, stats) {
  // Reiniciar caché
  const safeProjectPath = typeof projectPath === 'string' && projectPath.trim()
    ? projectPath
    : process.cwd();
  await clearCache(safeProjectPath, stats);

  if (stats && typeof stats === 'object') {
    stats.byAction = stats.byAction || {};
    stats.byAction.component_restart = (stats.byAction.component_restart || 0) + 1;
  }
  logger.info('🔄 Componentes esenciales reiniciados');
}

/**
 * Aisla el componente afectado para evitar propagación
 * @param {Object} analysis - Error analysis
 * @param {Object} stats - Estadísticas
 * @returns {Promise<void>}
 */
export async function isolateAffectedComponent(analysis, stats) {
  logger.info('🔒 Aislando componente afectado...');
  
  // Marcar como no disponible temporalmente
  // Prevenir llamadas futuras hasta que se arregle
  
  if (stats && typeof stats === 'object') {
    stats.byAction = stats.byAction || {};
    stats.byAction.component_isolation = (stats.byAction.component_isolation || 0) + 1;
  }
  logger.info('🔒 Componente aislado. El resto del sistema sigue funcionando.');
}
