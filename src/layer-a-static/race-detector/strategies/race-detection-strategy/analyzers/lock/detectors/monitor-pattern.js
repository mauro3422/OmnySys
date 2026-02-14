/**
 * @fileoverview Monitor Pattern Detector
 * @module race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/monitor-pattern
 */

/**
 * Detecta patrones de monitor/synchronized
 * @param {string} context - Contexto de código
 * @param {Object} access - Punto de acceso
 * @returns {LockInfo|null}
 */
export function detectMonitorPattern(context, access) {
  const monitorPattern = /(?:synchronized|withLock|monitor)\s*(?:\(|\{)/i;

  if (monitorPattern.test(context)) {
    return {
      type: 'monitor',
      target: access.name || 'unknown',
      scope: 'block',
      line: access.line,
      column: access.column
    };
  }

  return null;
}
