/**
 * @fileoverview Notification Bridge
 * 
 * Sistema global de notificaciones que captura errores/warnings
 * del logger y los hace visibles automáticamente.
 * 
 * Usage:
 *   import { notify, setHandler } from './notification-bridge.js';
 *   setHandler((msg, level) => console.log(`[NOTIFY] ${msg}`));
 */

const handlers = new Set();

export function setHandler(fn) {
  handlers.add(fn);
}

export function removeHandler(fn) {
  handlers.delete(fn);
}

export function notify(message, level = 'info') {
  for (const handler of handlers) {
    try {
      handler(message, level);
    } catch (e) {
      // Silently ignore handler errors
    }
  }
}

export function notifyError(error, context = '') {
  const msg = context ? `${context}: ${error.message || error}` : String(error);
  notify(msg, 'error');
}

export function notifyWarning(warning, context = '') {
  const msg = context ? `${context}: ${warning}` : String(warning);
  notify(msg, 'warn');
}

export default { notify, setHandler, removeHandler, notifyError, notifyWarning };
