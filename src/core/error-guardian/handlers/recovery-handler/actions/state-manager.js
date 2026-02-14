/**
 * @fileoverview State Manager
 * 
 * Gestiona el estado del sistema para recuperación.
 * 
 * @module core/error-guardian/handlers/recovery-handler/actions/state-manager
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:error:recovery');

/**
 * Guarda el estado del sistema antes de un error
 * @param {string} projectPath - Ruta del proyecto
 * @param {Object} stats - Estadísticas actuales
 * @returns {Promise<void>}
 */
export async function saveSystemState(projectPath, stats) {
  const statePath = path.join(projectPath, '.omnysysdata', 'error-state.json');
  const state = {
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    stats
  };

  try {
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, JSON.stringify(state, null, 2));
  } catch (e) {
    // Ignorar errores al guardar estado
    logger.debug('Could not save system state:', e.message);
  }
}
