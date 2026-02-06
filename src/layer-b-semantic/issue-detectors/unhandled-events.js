/**
 * @fileoverview unhandled-events.js
 * 
 * Detecta eventos emitidos pero sin listeners
 * 
 * @module issue-detectors/unhandled-events
 */

/**
 * Detecta eventos emitidos pero sin listeners
 * @param {object} globalState - Estado global indexado
 * @returns {Array} - Issues encontrados
 */
export function detectUnhandledEvents(globalState) {
  const issues = [];

  for (const [eventName, emitters] of Object.entries(globalState.events.emitters)) {
    const listeners = globalState.events.listeners[eventName];

    if (!listeners || listeners.length === 0) {
      issues.push({
        type: 'unhandled-event',
        event: eventName,
        emitters,
        severity: 'medium',
        reason: `Event "${eventName}" is emitted but no listeners found`,
        suggestion: 'Add listener or remove unused emit'
      });
    }
  }

  return issues;
}
