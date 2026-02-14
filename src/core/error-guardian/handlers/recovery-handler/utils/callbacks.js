/**
 * @fileoverview Callback Utilities
 * 
 * Gestión de callbacks de recuperación.
 * 
 * @module core/error-guardian/handlers/recovery-handler/utils/callbacks
 */

import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:error:recovery');

/**
 * Register a callback for specific severity levels
 * @param {Map} callbacks - Mapa de callbacks
 * @param {string} severity - Severity level
 * @param {Function} callback - Callback function
 */
export function registerCallback(callbacks, severity, callback) {
  if (!callbacks.has(severity)) {
    callbacks.set(severity, []);
  }
  callbacks.get(severity).push(callback);
}

/**
 * Execute callbacks for a severity level
 * @param {Map} callbacks - Mapa de callbacks
 * @param {string} severity - Severity level
 * @param {Object} analysis - Error analysis
 */
export async function executeCallback(callbacks, severity, analysis) {
  const cbList = callbacks.get(severity) || [];
  for (const callback of cbList) {
    try {
      await callback(analysis);
    } catch (e) {
      logger.warn('Recovery callback failed:', e.message);
    }
  }
}
