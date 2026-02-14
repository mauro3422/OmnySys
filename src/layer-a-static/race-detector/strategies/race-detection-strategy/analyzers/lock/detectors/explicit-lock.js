/**
 * @fileoverview Explicit Lock Detector
 * @module race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/explicit-lock
 */

/**
 * Detecta patrones de lock explícito (lock.acquire(), mutex.lock(), etc.)
 * @param {string} context - Contexto de código
 * @param {Object} access - Punto de acceso
 * @param {Function} determineScope - Función para determinar scope
 * @returns {LockInfo|null}
 */
export function detectExplicitLock(context, access, determineScope) {
  const lockPattern = /(\w+)(?:\.(?:acquire|lock|enter)\s*\(|\s*=\s*new\s*(?:Lock|Mutex))/i;
  const match = context.match(lockPattern);

  if (match) {
    const lockName = match[1];

    const hasRelease = context.includes(`${lockName}.release`) ||
                       context.includes(`${lockName}.unlock`) ||
                       context.includes(`${lockName}.exit`);

    return {
      type: 'explicit',
      target: access.name || 'unknown',
      scope: determineScope(lockName, context),
      line: access.line,
      column: access.column,
      lockName,
      hasRelease
    };
  }

  return null;
}
